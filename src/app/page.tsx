import { createClient } from '@/lib/supabase/server';
import { SignInButton } from '@/features/auth';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, middleware will redirect them
  // This page is only shown to non-authenticated users

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold text-gray-800">MacroWeb</span>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Track Your Nutrition,
            <span className="text-emerald-500 block mt-2">Transform Your Life</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Personalized macro tracking with AI-powered food recognition. 
            Set your goals, log your meals, and watch your progress with weekly intelligent adjustments.
          </p>

          <div className="flex flex-col items-center gap-4">
            <SignInButton />
            <p className="text-sm text-gray-500">
              Free to use • No credit card required
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<ChartIcon />}
            title="Smart Goal Setting"
            description="Set realistic weight goals with personalized macro targets based on your body and activity level."
            color="emerald"
          />
          <FeatureCard
            icon={<BoltIcon />}
            title="AI-Powered Logging"
            description="Can't find a food? Our AI generates accurate nutritional data for any meal or dish."
            color="blue"
          />
          <FeatureCard
            icon={<RefreshIcon />}
            title="Weekly Check-Ins"
            description="Our algorithm adjusts your targets weekly based on your actual progress, not just estimates."
            color="purple"
          />
        </div>

        {/* How It Works */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          
          <div className="space-y-8">
            <Step number={1} title="Complete Your Profile" description="Tell us your current stats, goal weight, and when you want to reach it." />
            <Step number={2} title="Get Your Personalized Plan" description="We calculate your TDEE and create macro targets based on your preferences." />
            <Step number={3} title="Log & Track Daily" description="Search our database or let AI create entries for any food you eat." />
            <Step number={4} title="Check In Weekly" description="Weigh in each week and we'll automatically adjust your targets for optimal progress." />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MacroWeb. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  const bgColor = color === 'emerald' ? 'bg-emerald-100' : color === 'blue' ? 'bg-blue-100' : 'bg-purple-100';
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
