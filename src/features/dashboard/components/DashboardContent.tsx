'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@/features/auth';
import { FoodSearch } from '@/features/food-search';
import { isCheckInAvailable, daysUntilCheckIn } from '@/lib/algorithm';
import type { Goals, Log, WeightHistory } from '@/lib/supabase/database.types';

interface DashboardContentProps {
  goals: Goals;
  todayLogs: (Log & { food: { name: string; serving_size: number; serving_unit: string } | null })[];
  weightHistory: WeightHistory[];
  userEmail: string;
}

export function DashboardContent({ goals, todayLogs, weightHistory, userEmail }: DashboardContentProps) {
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [logs, setLogs] = useState(todayLogs);

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fat: acc.fat + (log.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [logs]);

  const remaining = {
    calories: goals.daily_calories - totals.calories,
    protein: goals.protein_grams - totals.protein,
    carbs: goals.carbs_grams - totals.carbs,
    fat: goals.fat_grams - totals.fat,
  };

  const progress = {
    calories: Math.min((totals.calories / goals.daily_calories) * 100, 100),
    protein: Math.min((totals.protein / goals.protein_grams) * 100, 100),
    carbs: Math.min((totals.carbs / goals.carbs_grams) * 100, 100),
    fat: Math.min((totals.fat / goals.fat_grams) * 100, 100),
  };

  const checkInAvailable = isCheckInAvailable(goals.last_check_in ? new Date(goals.last_check_in) : null);
  const daysUntilNext = daysUntilCheckIn(goals.last_check_in ? new Date(goals.last_check_in) : null);

  const handleFoodLogged = (newLog: Log & { food: { name: string; serving_size: number; serving_unit: string } | null }) => {
    setLogs(prev => [...prev, newLog]);
    setShowFoodSearch(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-xl font-bold text-gray-800">MacroWeb</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{userEmail}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Check-in banner */}
        {checkInAvailable && (
          <Link
            href="/check-in"
            className="block mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-semibold text-emerald-800">Weekly Check-In Available!</p>
                  <p className="text-sm text-emerald-600">Log your weight and see your progress adjustments</p>
                </div>
              </div>
              <span className="text-emerald-600">→</span>
            </div>
          </Link>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content - Today's Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calorie summary card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Today&apos;s Progress</h2>
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {/* Main calorie ring */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={progress.calories >= 100 ? '#ef4444' : '#10b981'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${progress.calories * 2.83} 283`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{Math.round(totals.calories)}</span>
                    <span className="text-sm text-gray-500">of {Math.round(goals.daily_calories)} kcal</span>
                  </div>
                </div>
              </div>

              {/* Macro bars */}
              <div className="grid grid-cols-3 gap-4">
                <MacroBar
                  label="Protein"
                  current={totals.protein}
                  target={goals.protein_grams}
                  color="blue"
                  unit="g"
                />
                <MacroBar
                  label="Carbs"
                  current={totals.carbs}
                  target={goals.carbs_grams}
                  color="amber"
                  unit="g"
                />
                <MacroBar
                  label="Fat"
                  current={totals.fat}
                  target={goals.fat_grams}
                  color="pink"
                  unit="g"
                />
              </div>
            </div>

            {/* Food log */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Food Log</h2>
                <button
                  onClick={() => setShowFoodSearch(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <span>+</span> Add Food
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">🍽️</span>
                  <p className="text-gray-600 mb-4">No foods logged today</p>
                  <button
                    onClick={() => setShowFoodSearch(true)}
                    className="text-emerald-600 font-medium hover:text-emerald-700"
                  >
                    Log your first meal →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
                    const mealLogs = logs.filter((l) => l.meal_type === mealType);
                    if (mealLogs.length === 0) return null;

                    return (
                      <div key={mealType}>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          {mealType}
                        </h3>
                        <div className="space-y-2">
                          {mealLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {log.food?.name || 'Unknown Food'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {log.servings} × {log.food?.serving_size}{log.food?.serving_unit}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{Math.round(log.calories)} kcal</p>
                                <p className="text-xs text-gray-500">
                                  P: {Math.round(log.protein)}g | C: {Math.round(log.carbs)}g | F: {Math.round(log.fat)}g
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Goal summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Your Goal</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current</span>
                  <span className="font-semibold text-gray-900">{goals.current_weight} lbs</span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full">
                  <div
                    className="absolute h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((goals.starting_weight - goals.current_weight) / (goals.starting_weight - goals.target_weight)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Target</span>
                  <span className="font-semibold text-emerald-600">{goals.target_weight} lbs</span>
                </div>
                <div className="text-center pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Target date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(goals.target_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly check-in status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Check-In</h2>
              
              {checkInAvailable ? (
                <Link
                  href="/check-in"
                  className="block w-full py-3 bg-emerald-500 text-white text-center rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                >
                  Check In Now
                </Link>
              ) : (
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{daysUntilNext}</p>
                  <p className="text-gray-600">days until next check-in</p>
                </div>
              )}
            </div>

            {/* Recent weights */}
            {weightHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Weight History</h2>
                <div className="space-y-2">
                  {weightHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {new Date(entry.logged_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="font-medium text-gray-900">{entry.weight} lbs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Remaining Today</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Calories</span>
                  <span className={`font-semibold ${remaining.calories < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Math.round(remaining.calories)} kcal
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Protein</span>
                  <span className={`font-semibold ${remaining.protein < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Math.round(remaining.protein)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Carbs</span>
                  <span className={`font-semibold ${remaining.carbs < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Math.round(remaining.carbs)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fat</span>
                  <span className={`font-semibold ${remaining.fat < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Math.round(remaining.fat)}g
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Food search modal */}
      {showFoodSearch && (
        <FoodSearch
          onClose={() => setShowFoodSearch(false)}
          onFoodLogged={handleFoodLogged}
        />
      )}
    </div>
  );
}

function MacroBar({
  label,
  current,
  target,
  color,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  color: 'blue' | 'amber' | 'pink';
  unit: string;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    pink: 'bg-pink-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {Math.round(current)}/{Math.round(target)}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
