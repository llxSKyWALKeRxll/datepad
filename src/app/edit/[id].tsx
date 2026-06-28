import { useLocalSearchParams } from 'expo-router';

import { DateForm } from '@/components/date-form';
import { useStore } from '@/lib/store';

export default function EditDateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDate } = useStore();
  const existing = getDate(id);

  // If the date was just deleted or id is bad, render an empty create form.
  return <DateForm existing={existing} />;
}
