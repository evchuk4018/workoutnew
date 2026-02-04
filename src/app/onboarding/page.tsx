import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/features/onboarding';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if already onboarded
  const { data: goals } = await supabase
    .from('goals')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single() as { data: { onboarding_completed: boolean } | null };

  if (goals?.onboarding_completed) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-gray-800">MacroWeb</span>
        </div>
      </div>
      
      <OnboardingWizard />
    </main>
  );
}
