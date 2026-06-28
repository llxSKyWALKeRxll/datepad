// send-reminders — daily Expo Push job for DatePad.
//
// Scheduled by pg_cron (see migration). For each reminder due today it looks up
// the owner's device push tokens and sends an Expo push notification.
//
// Request body (all optional, for testing):
//   { "today": "2026-06-29", "dryRun": true }
//   - today:  compute reminders as if it were this date (default: server date)
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

Deno.serve(async (req) => {
  let today: string | undefined;
  let dryRun = false;
  try {
    const body = await req.json();
    today = body?.today;
    dryRun = body?.dryRun === true;
  } catch {
    // no body — use defaults
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: due, error: dueErr } = await supabase.rpc('reminders_due', today ? { p_today: today } : {});
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
      data: { dateId: row.date_id },
    }));
  });

  if (dryRun || messages.length === 0) {
    return Response.json({ due: rows.length, sent: 0, dryRun, messages });
  }

  // Expo accepts up to 100 messages per request.
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

  return Response.json({ due: rows.length, sent, receipts });
});
