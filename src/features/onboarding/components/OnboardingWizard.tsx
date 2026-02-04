'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { GoalsInsert, WeightHistoryInsert } from '@/lib/supabase/database.types';
import {
  calculateAge,
  calculateTDEE,
  calculateDailyCalorieTarget,
  getMacroTargets,
  calculateRequiredWeeklyChange,
  validateGoalSafety,
  lbsToKg,
  feetInchesToCm,
  MACRO_PRESETS,
  type Gender,
  type ActivityLevel,
  type GoalType,
  type MacroPreference,
} from '@/lib/algorithm';

type Step = 'baseline' | 'goal' | 'timeline' | 'macros' | 'summary';

interface FormData {
  gender: Gender;
  heightFeet: number;
  heightInches: number;
  currentWeight: number;
  dateOfBirth: string;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeight: number;
  targetDate: string;
  macroPreference: MacroPreference;
  proteinRatio: number;
  carbsRatio: number;
  fatRatio: number;
}

const initialFormData: FormData = {
  gender: 'male',
  heightFeet: 5,
  heightInches: 10,
  currentWeight: 180,
  dateOfBirth: '1990-01-01',
  activityLevel: 'moderate',
  goalType: 'lose',
  targetWeight: 170,
  targetDate: '',
  macroPreference: 'balanced',
  proteinRatio: 0.30,
  carbsRatio: 0.35,
  fatRatio: 0.35,
};

export function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState<Step>('baseline');
  const [formData, setFormData] = useState<FormData>(() => {
    // Set default target date to 12 weeks from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 84);
    return {
      ...initialFormData,
      targetDate: targetDate.toISOString().split('T')[0],
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError(null);
    setWarning(null);
  };

  const handleMacroPreferenceChange = (preference: MacroPreference) => {
    const preset = MACRO_PRESETS[preference];
    updateFormData({
      macroPreference: preference,
      proteinRatio: preset.protein,
      carbsRatio: preset.carbs,
      fatRatio: preset.fat,
    });
  };

  const validateTimeline = () => {
    const weeklyChange = calculateRequiredWeeklyChange(
      formData.currentWeight,
      formData.targetWeight,
      new Date(formData.targetDate)
    );
    
    const validation = validateGoalSafety(weeklyChange);
    
    if (!validation.isSafe) {
      setWarning(validation.message);
    } else {
      setWarning(null);
    }
    
    return validation.isRealistic;
  };

  const calculateResults = () => {
    const heightCm = feetInchesToCm(formData.heightFeet, formData.heightInches);
    const weightKg = lbsToKg(formData.currentWeight);
    const ageYears = calculateAge(new Date(formData.dateOfBirth));
    
    const tdee = calculateTDEE({
      gender: formData.gender,
      weightKg,
      heightCm,
      ageYears,
      activityLevel: formData.activityLevel,
    });
    
    const { dailyCalories, weeklyChange } = calculateDailyCalorieTarget({
      tdee,
      currentWeightLbs: formData.currentWeight,
      targetWeightLbs: formData.targetWeight,
      targetDate: new Date(formData.targetDate),
      gender: formData.gender,
    });
    
    const macros = getMacroTargets(dailyCalories, formData.macroPreference, {
      protein: formData.proteinRatio,
      carbs: formData.carbsRatio,
      fat: formData.fatRatio,
    });
    
    return {
      tdee,
      dailyCalories: macros.dailyCalories,
      proteinGrams: macros.proteinGrams,
      carbsGrams: macros.carbsGrams,
      fatGrams: macros.fatGrams,
      weeklyChange,
      heightCm,
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const results = calculateResults();
      
      const goalsData: GoalsInsert = {
        user_id: user.id,
        gender: formData.gender,
        height_cm: results.heightCm,
        date_of_birth: formData.dateOfBirth,
        activity_level: formData.activityLevel,
        starting_weight: formData.currentWeight,
        current_weight: formData.currentWeight,
        target_weight: formData.targetWeight,
        target_date: formData.targetDate,
        goal_type: formData.goalType,
        macro_preference: formData.macroPreference,
        protein_ratio: formData.proteinRatio,
        carbs_ratio: formData.carbsRatio,
        fat_ratio: formData.fatRatio,
        tdee: results.tdee,
        daily_calories: results.dailyCalories,
        protein_grams: results.proteinGrams,
        carbs_grams: results.carbsGrams,
        fat_grams: results.fatGrams,
        onboarding_completed: true,
      };
      
      const { error: insertError } = await supabase.from('goals').insert(goalsData as never);
      
      if (insertError) {
        throw insertError;
      }
      
      // Also log initial weight
      const weightData: WeightHistoryInsert = {
        user_id: user.id,
        weight: formData.currentWeight,
      };
      await supabase.from('weight_history').insert(weightData as never);
      
      router.push('/dashboard');
    } catch (err) {
      console.error('Error saving goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to save your goals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['baseline', 'goal', 'timeline', 'macros', 'summary'];
    const currentIndex = steps.indexOf(step);
    
    if (step === 'timeline') {
      validateTimeline();
    }
    
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['baseline', 'goal', 'timeline', 'macros', 'summary'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const results = step === 'summary' ? calculateResults() : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {['Baseline', 'Goal', 'Timeline', 'Macros', 'Summary'].map((label, index) => {
            const steps: Step[] = ['baseline', 'goal', 'timeline', 'macros', 'summary'];
            const isActive = steps.indexOf(step) >= index;
            return (
              <span
                key={label}
                className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}
              >
                {label}
              </span>
            );
          })}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((['baseline', 'goal', 'timeline', 'macros', 'summary'].indexOf(step) + 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {step === 'baseline' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get to know you</h2>
              <p className="text-gray-600">This helps us calculate your daily energy needs.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-3">
                {(['male', 'female', 'other'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateFormData({ gender: g })}
                    className={`py-3 px-4 rounded-lg border-2 capitalize font-medium transition-colors ${
                      formData.gender === g
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.heightFeet}
                      onChange={(e) => updateFormData({ heightFeet: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      min={3}
                      max={8}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.heightInches}
                      onChange={(e) => updateFormData({ heightInches: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      min={0}
                      max={11}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">in</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Weight</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.currentWeight}
                  onChange={(e) => updateFormData({ currentWeight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min={50}
                  max={500}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">lbs</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
              <select
                value={formData.activityLevel}
                onChange={(e) => updateFormData({ activityLevel: e.target.value as ActivityLevel })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Lightly Active (1-3 days/week)</option>
                <option value="moderate">Moderately Active (3-5 days/week)</option>
                <option value="active">Very Active (6-7 days/week)</option>
                <option value="very_active">Extremely Active (physical job + exercise)</option>
              </select>
            </div>
          </div>
        )}

        {step === 'goal' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your goal?</h2>
              <p className="text-gray-600">Select what you want to achieve.</p>
            </div>

            <div className="grid gap-4">
              {([
                { type: 'lose', label: 'Lose Weight', icon: '📉', description: 'Burn fat while preserving muscle' },
                { type: 'maintain', label: 'Maintain Weight', icon: '⚖️', description: 'Keep your current weight stable' },
                { type: 'gain', label: 'Gain Weight', icon: '📈', description: 'Build muscle and increase mass' },
              ] as const).map(({ type, label, icon, description }) => (
                <button
                  key={type}
                  onClick={() => updateFormData({ goalType: type })}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    formData.goalType === type
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{label}</div>
                      <div className="text-sm text-gray-600">{description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'timeline' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set your timeline</h2>
              <p className="text-gray-600">When do you want to reach your goal?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Weight</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.targetWeight}
                  onChange={(e) => updateFormData({ targetWeight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min={50}
                  max={500}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">lbs</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {formData.goalType === 'lose' && formData.targetWeight >= formData.currentWeight && (
                  <span className="text-amber-600">Target should be less than current weight for weight loss</span>
                )}
                {formData.goalType === 'gain' && formData.targetWeight <= formData.currentWeight && (
                  <span className="text-amber-600">Target should be more than current weight for weight gain</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => updateFormData({ targetDate: e.target.value })}
                min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {warning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <p className="text-amber-700 text-sm">{warning}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'macros' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your macro split</h2>
              <p className="text-gray-600">How do you want to distribute your calories?</p>
            </div>

            <div className="grid gap-4">
              {([
                { type: 'balanced', label: 'Balanced', ratios: '30P / 35C / 35F', description: 'Good all-around distribution' },
                { type: 'high_protein', label: 'High Protein', ratios: '40P / 30C / 30F', description: 'Great for muscle building' },
                { type: 'low_carb', label: 'Low Carb', ratios: '35P / 20C / 45F', description: 'Moderate carb restriction' },
                { type: 'keto', label: 'Keto', ratios: '30P / 5C / 65F', description: 'Very low carb, high fat' },
                { type: 'manual', label: 'Custom', ratios: 'Set your own', description: 'Fully customize your macros' },
              ] as const).map(({ type, label, ratios, description }) => (
                <button
                  key={type}
                  onClick={() => handleMacroPreferenceChange(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    formData.macroPreference === type
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">{label}</div>
                      <div className="text-sm text-gray-600">{description}</div>
                    </div>
                    <div className="text-sm font-mono text-gray-500">{ratios}</div>
                  </div>
                </button>
              ))}
            </div>

            {formData.macroPreference === 'manual' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Protein</label>
                    <span className="text-sm text-gray-500">{Math.round(formData.proteinRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={formData.proteinRatio * 100}
                    onChange={(e) => updateFormData({ proteinRatio: parseInt(e.target.value) / 100 })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Carbs</label>
                    <span className="text-sm text-gray-500">{Math.round(formData.carbsRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={formData.carbsRatio * 100}
                    onChange={(e) => updateFormData({ carbsRatio: parseInt(e.target.value) / 100 })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Fat</label>
                    <span className="text-sm text-gray-500">{Math.round(formData.fatRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={70}
                    value={formData.fatRatio * 100}
                    onChange={(e) => updateFormData({ fatRatio: parseInt(e.target.value) / 100 })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Total: {Math.round((formData.proteinRatio + formData.carbsRatio + formData.fatRatio) * 100)}%
                  {Math.abs((formData.proteinRatio + formData.carbsRatio + formData.fatRatio) - 1) > 0.01 && (
                    <span className="text-amber-600 ml-2">(will be normalized to 100%)</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'summary' && results && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your personalized plan</h2>
              <p className="text-gray-600">Here&apos;s what we calculated for you.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="text-sm text-emerald-600 font-medium">Daily Calories</div>
                <div className="text-3xl font-bold text-emerald-700">{Math.round(results.dailyCalories)}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-600 font-medium">Estimated TDEE</div>
                <div className="text-3xl font-bold text-gray-700">{Math.round(results.tdee)}</div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-600 font-medium mb-3">Daily Macro Targets</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.proteinGrams}g</div>
                  <div className="text-sm text-gray-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{results.carbsGrams}g</div>
                  <div className="text-sm text-gray-600">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{results.fatGrams}g</div>
                  <div className="text-sm text-gray-600">Fat</div>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="text-sm text-gray-600 mb-2">Your Journey</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900">{formData.currentWeight} lbs</div>
                  <div className="text-sm text-gray-500">Current</div>
                </div>
                <div className="flex-1 mx-4 h-1 bg-gray-200 rounded relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600">{formData.targetWeight} lbs</div>
                  <div className="text-sm text-gray-500">Goal</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Expected rate: {Math.abs(results.weeklyChange).toFixed(1)} lbs/week
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={prevStep}
            disabled={step === 'baseline'}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              step === 'baseline'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Back
          </button>
          
          {step === 'summary' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Start Tracking'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
