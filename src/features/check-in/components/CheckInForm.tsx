'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  performWeeklyCheckIn,
  calculateRequiredWeeklyChange,
} from '@/lib/algorithm';
import type { Goals, CheckInInsert, GoalsUpdate, WeightHistoryInsert } from '@/lib/supabase/database.types';

interface CheckInFormProps {
  goals: Goals;
  latestWeight: number;
  previousWeight: number;
  avgDailyCalories: number;
  daysLogged: number;
}

export function CheckInForm({
  goals,
  latestWeight,
  previousWeight,
  avgDailyCalories,
  daysLogged,
}: CheckInFormProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentWeight, setCurrentWeight] = useState(latestWeight);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof performWeeklyCheckIn> | null>(null);

  const handleCalculate = () => {
    const checkInResults = performWeeklyCheckIn({
      previousWeight,
      currentWeight,
      avgDailyCalories,
      currentDailyTarget: goals.daily_calories,
      targetWeightLbs: goals.target_weight,
      targetDate: new Date(goals.target_date),
      macroPreference: goals.macro_preference as 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'manual',
      proteinRatio: goals.protein_ratio,
      carbsRatio: goals.carbs_ratio,
      fatRatio: goals.fat_ratio,
    });

    setResults(checkInResults);
    setShowResults(true);
  };

  const handleSubmit = async () => {
    if (!results) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Insert check-in record
      const checkInData: CheckInInsert = {
        user_id: user.id,
        weight: currentWeight,
        previous_weight: previousWeight,
        weight_change: results.actualWeeklyChange,
        avg_daily_calories: avgDailyCalories,
        calculated_tdee: results.calculatedTDEE,
        expected_weekly_change: results.expectedWeeklyChange,
        actual_weekly_change: results.actualWeeklyChange,
        old_daily_calories: goals.daily_calories,
        new_daily_calories: results.newDailyCalories,
        adjustment_reason: results.adjustmentReason,
        new_protein_grams: results.newProteinGrams,
        new_carbs_grams: results.newCarbsGrams,
        new_fat_grams: results.newFatGrams,
      };
      const { error: checkInError } = await supabase.from('check_ins').insert(checkInData as never);

      if (checkInError) throw checkInError;

      // Update goals with new targets
      const goalsUpdateData: GoalsUpdate = {
        current_weight: currentWeight,
        daily_calories: results.newDailyCalories,
        protein_grams: results.newProteinGrams,
        carbs_grams: results.newCarbsGrams,
        fat_grams: results.newFatGrams,
        last_check_in: today,
      };
      const { error: goalsError } = await supabase
        .from('goals')
        .update(goalsUpdateData as never)
        .eq('user_id', user.id);

      if (goalsError) throw goalsError;

      // Log weight
      const weightData: WeightHistoryInsert = {
        user_id: user.id,
        weight: currentWeight,
        logged_date: today,
      };
      await supabase.from('weight_history').upsert(weightData as never);

      router.push('/dashboard');
    } catch (err) {
      console.error('Check-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expectedWeeklyChange = calculateRequiredWeeklyChange(
    goals.current_weight,
    goals.target_weight,
    new Date(goals.target_date)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {!showResults ? (
        <>
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">📊</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Weekly Check-In</h1>
            <p className="text-gray-600">
              Let&apos;s see how your week went and adjust your plan accordingly.
            </p>
          </div>

          {/* Week summary */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Days Logged</p>
              <p className="text-2xl font-bold text-gray-900">{daysLogged}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Avg Daily Intake</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(avgDailyCalories)} kcal</p>
            </div>
          </div>

          {/* Weight input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Weight
            </label>
            <div className="relative">
              <input
                type="number"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                step={0.1}
                min={50}
                max={500}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">lbs</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Previous weight: {previousWeight} lbs
            </p>
          </div>

          {/* Expected vs actual preview */}
          <div className="p-4 border border-gray-200 rounded-xl mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Expected Change</p>
                <p className={`text-lg font-bold ${expectedWeeklyChange < 0 ? 'text-emerald-600' : expectedWeeklyChange > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {expectedWeeklyChange > 0 ? '+' : ''}{expectedWeeklyChange.toFixed(1)} lbs/week
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Actual Change</p>
                <p className={`text-lg font-bold ${(currentWeight - previousWeight) < 0 ? 'text-emerald-600' : (currentWeight - previousWeight) > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {(currentWeight - previousWeight) > 0 ? '+' : ''}{(currentWeight - previousWeight).toFixed(1)} lbs
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Calculate Adjustments
          </button>
        </>
      ) : results && (
        <>
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">✨</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Updated Plan</h1>
            <p className="text-gray-600">{results.adjustmentReason}</p>
          </div>

          {/* Results */}
          <div className="space-y-6 mb-8">
            {/* TDEE */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Calculated True TDEE</p>
                  <p className="text-sm text-blue-500">Based on your actual intake & weight change</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{Math.round(results.calculatedTDEE)} kcal</p>
              </div>
            </div>

            {/* Calorie adjustment */}
            <div className="p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-emerald-600 font-medium mb-2">Daily Calorie Target</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-lg text-gray-500">{Math.round(goals.daily_calories)}</p>
                  <p className="text-xs text-gray-400">Previous</p>
                </div>
                <span className="text-2xl">→</span>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-700">{Math.round(results.newDailyCalories)}</p>
                  <p className="text-xs text-emerald-500">New Target</p>
                </div>
              </div>
              {results.newDailyCalories !== goals.daily_calories && (
                <p className="text-sm text-emerald-600 mt-2 text-center">
                  {results.newDailyCalories > goals.daily_calories ? '+' : ''}
                  {Math.round(results.newDailyCalories - goals.daily_calories)} kcal/day
                </p>
              )}
            </div>

            {/* New macro targets */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 font-medium mb-3">New Daily Macro Targets</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{Math.round(results.newProteinGrams)}g</p>
                  <p className="text-xs text-gray-500">Protein</p>
                  {results.newProteinGrams !== goals.protein_grams && (
                    <p className="text-xs text-blue-500">
                      ({results.newProteinGrams > goals.protein_grams ? '+' : ''}
                      {Math.round(results.newProteinGrams - goals.protein_grams)}g)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{Math.round(results.newCarbsGrams)}g</p>
                  <p className="text-xs text-gray-500">Carbs</p>
                  {results.newCarbsGrams !== goals.carbs_grams && (
                    <p className="text-xs text-amber-500">
                      ({results.newCarbsGrams > goals.carbs_grams ? '+' : ''}
                      {Math.round(results.newCarbsGrams - goals.carbs_grams)}g)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-600">{Math.round(results.newFatGrams)}g</p>
                  <p className="text-xs text-gray-500">Fat</p>
                  {results.newFatGrams !== goals.fat_grams && (
                    <p className="text-xs text-pink-500">
                      ({results.newFatGrams > goals.fat_grams ? '+' : ''}
                      {Math.round(results.newFatGrams - goals.fat_grams)}g)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setShowResults(false)}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Apply Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
