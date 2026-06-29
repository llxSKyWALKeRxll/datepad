// send-reminders — daily Expo Push job for DatePad.
//
// Scheduled by pg_cron (see migration). For each reminder due today it looks up
// the owner's device push tokens and sends an Expo push notification.
//
// Request body (all optional, for testing):
//   { "now": "2026-06-29T09:00:00Z", "dryRun": true }
//   - now:    compute reminders as if it were this instant (default: now()).
//             Each user's local date/hour is derived from their profile timezone.
//   - dryRun: build the messages but don't actually POST to Expo
//
// Auth: invoked with the service-role key, so it reads across all users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const BUILTIN_NOUNS: Record<string, string> = {
  birthday: 'birthday',
  anniversary: 'anniversary',
  holiday: 'holiday',
  reminder: 'reminder',
};

interface DueRow {
  date_id: string;
  user_id: string;
  name: string;
  category_id: string;
  lead: number;
  occurs_on: string;
  email_reminders: boolean;
  user_email: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function whenPhrase(lead: number): string {
  if (lead <= 0) return 'today';
  if (lead === 1) return 'tomorrow';
  return `in ${lead} days`;
}

function prettyDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function buildMessage(row: DueRow): { title: string; body: string } {
  const noun = BUILTIN_NOUNS[row.category_id] ?? 'date';
  const when = whenPhrase(row.lead);
  const isBday = row.category_id === 'birthday';
  const isAnniv = row.category_id === 'anniversary';

  if (row.lead <= 0) {
    const title = isBday ? `🎂 ${row.name}'s birthday is today` : `📌 ${row.name} is today`;
    return { title, body: `Don't forget — ${row.name}'s ${noun} is today.` };
  }

  const subject = isBday || isAnniv ? `${row.name}'s ${noun}` : row.name;
  return {
    title: `${subject} is ${when}`,
    body: `${subject} is ${when} (${prettyDate(row.occurs_on)}).`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
}

/** Send one reminder email via Resend. Returns whether it was actually sent. */
async function sendEmail(to: string, title: string, body: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'DatePad <reminders@datepad.app>';
  if (!apiKey) return false; // not configured — caller treats as dry-run
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:480px">` +
    `<h2 style="color:#FF6B5E;margin:0 0 8px">${escapeHtml(title)}</h2>` +
    `<p style="font-size:16px;color:#22201E;margin:0">${escapeHtml(body)}</p>` +
    `<p style="font-size:12px;color:#8A817C;margin-top:24px">Sent by DatePad — never forget a date that matters.</p>` +
    `</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject: title, html }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  let now: string | undefined;
  let dryRun = false;
  try {
    const body = await req.json();
    now = body?.now;
    dryRun = body?.dryRun === true;
  } catch {
    // no body — use defaults
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: due, error: dueErr } = await supabase.rpc('reminders_due', now ? { p_now: now } : {});
  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = (due ?? []) as DueRow[];
  if (rows.length === 0) {
    return Response.json({ due: 0, sent: 0, messages: [] });
  }

  // Look up push tokens for the affected users.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: tokens, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', userIds);
  if (tokErr) {
    return new Response(JSON.stringify({ error: tokErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  const messages = rows.flatMap((row) => {
    const { title, body } = buildMessage(row);
    return (tokensByUser.get(row.user_id) ?? []).map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      categoryId: 'reminder', // shows Mark-handled / Snooze action buttons
      data: { dateId: row.date_id, occursOn: row.occurs_on },
    }));
  });

  // Email channel: one email per due date that opted into email reminders.
  const emailTargets = rows
    .filter((r) => r.email_reminders && r.user_email)
    .map((r) => {
      const { title, body } = buildMessage(r);
      return { to: r.user_email as string, title, body };
    });

  if (dryRun) {
    return Response.json({
      due: rows.length,
      sent: 0,
      emailed: 0,
      dryRun,
      messages,
      emails: emailTargets,
    });
  }

  // Push: Expo accepts up to 100 messages per request.
  let sent = 0;
  const receipts: unknown[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    receipts.push(await res.json());
    if (res.ok) sent += batch.length;
  }

  // Email.
  let emailed = 0;
  for (const e of emailTargets) {
    if (await sendEmail(e.to, e.title, e.body)) emailed += 1;
  }

  return Response.json({ due: rows.length, sent, emailed, receipts });
});
