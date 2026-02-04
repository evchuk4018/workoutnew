import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from '@/features/dashboard';
import type { Goals, Log, WeightHistory } from '@/lib/supabase/database.types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get user's goals
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: Goals | null; error: Error | null };

  if (goalsError || !goals?.onboarding_completed) {
    redirect('/onboarding');
  }

  // Get today's logs
  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs } = await supabase
    .from('logs')
    .select(`
      *,
      food:foods(name, serving_size, serving_unit)
    `)
    .eq('user_id', user.id)
    .eq('log_date', today)
    .order('created_at', { ascending: true }) as { data: (Log & { food: { name: string; serving_size: number; serving_unit: string } | null })[] | null };

  // Get recent weight entries
  const { data: weightHistory } = await supabase
    .from('weight_history')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })
    .limit(7) as { data: WeightHistory[] | null };

  return (
    <DashboardContent
      goals={goals}
      todayLogs={todayLogs || []}
      weightHistory={weightHistory || []}
      userEmail={user.email || ''}
    />
  );
}
