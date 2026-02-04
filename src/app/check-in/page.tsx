import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CheckInForm } from '@/features/check-in';
import { isCheckInAvailable } from '@/lib/algorithm';
import type { Goals, WeightHistory } from '@/lib/supabase/database.types';

export default async function CheckInPage() {
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

  // Check if check-in is available
  const lastCheckIn = goals.last_check_in ? new Date(goals.last_check_in) : null;
  if (!isCheckInAvailable(lastCheckIn)) {
    redirect('/dashboard');
  }

  // Get last 7 days of logs for average calculation
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentLogs } = await supabase
    .from('logs')
    .select('calories, log_date')
    .eq('user_id', user.id)
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0]) as { data: { calories: number; log_date: string }[] | null };

  // Calculate average daily calories
  const dailyCalories: Record<string, number> = {};
  recentLogs?.forEach(log => {
    dailyCalories[log.log_date] = (dailyCalories[log.log_date] || 0) + log.calories;
  });
  
  const daysLogged = Object.keys(dailyCalories).length;
  const totalCalories = Object.values(dailyCalories).reduce((sum, cal) => sum + cal, 0);
  const avgDailyCalories = daysLogged > 0 ? totalCalories / daysLogged : goals.daily_calories;

  // Get most recent weight entry
  const { data: latestWeight } = await supabase
    .from('weight_history')
    .select('weight, logged_date')
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })
    .limit(1)
    .single() as { data: { weight: number; logged_date: string } | null };

  // Get previous weight (from 7+ days ago)
  const { data: previousWeight } = await supabase
    .from('weight_history')
    .select('weight')
    .eq('user_id', user.id)
    .lt('logged_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('logged_date', { ascending: false })
    .limit(1)
    .single() as { data: { weight: number } | null };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-gray-800">MacroWeb</span>
        </div>
        
        <CheckInForm
          goals={goals}
          latestWeight={latestWeight?.weight || goals.current_weight}
          previousWeight={previousWeight?.weight || goals.current_weight}
          avgDailyCalories={avgDailyCalories}
          daysLogged={daysLogged}
        />
      </div>
    </main>
  );
}
