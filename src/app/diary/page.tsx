import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DiaryView } from '@/features/logging';

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { date: dateParam } = await searchParams;
  const selectedDate = dateParam || new Date().toISOString().split('T')[0];

  // Get logs for selected date
  const { data: logs } = await supabase
    .from('logs')
    .select(`
      *,
      food:foods(name, serving_size, serving_unit, brand)
    `)
    .eq('user_id', user.id)
    .eq('log_date', selectedDate)
    .order('created_at', { ascending: true });

  // Get user's goals
  const { data: goals } = await supabase
    .from('goals')
    .select('daily_calories, protein_grams, carbs_grams, fat_grams')
    .eq('user_id', user.id)
    .single();

  return (
    <DiaryView
      logs={logs || []}
      selectedDate={selectedDate}
      goals={goals}
    />
  );
}
