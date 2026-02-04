/**
 * MacroWeb Algorithm Library
 * 
 * Contains all TDEE, BMR, and weight trend calculations
 * Based on Mifflin-St Jeor equation
 */

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MacroPreference = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'manual';

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Very hard exercise & physical job
};

// Macro preference ratios (protein, carbs, fat)
export const MACRO_PRESETS: Record<MacroPreference, { protein: number; carbs: number; fat: number }> = {
  balanced: { protein: 0.30, carbs: 0.35, fat: 0.35 },
  high_protein: { protein: 0.40, carbs: 0.30, fat: 0.30 },
  low_carb: { protein: 0.35, carbs: 0.20, fat: 0.45 },
  keto: { protein: 0.30, carbs: 0.05, fat: 0.65 },
  manual: { protein: 0.30, carbs: 0.35, fat: 0.35 }, // Default for manual, user will override
};

// Calories per gram for macros
export const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

// 1 pound = ~3500 calories deficit/surplus
const CALORIES_PER_POUND = 3500;

// Safety limits
const MIN_CALORIES_MALE = 1500;
const MIN_CALORIES_FEMALE = 1200;
const MAX_WEEKLY_LOSS_LBS = 2;
const MAX_WEEKLY_GAIN_LBS = 1;

export interface BMRInput {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

export interface TDEEInput extends BMRInput {
  activityLevel: ActivityLevel;
}

export interface GoalCalculationInput {
  tdee: number;
  currentWeightLbs: number;
  targetWeightLbs: number;
  targetDate: Date;
  gender: Gender;
}

export interface MacroTargets {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface WeeklyCheckInInput {
  previousWeight: number;
  currentWeight: number;
  avgDailyCalories: number;
  currentDailyTarget: number;
  targetWeightLbs: number;
  targetDate: Date;
  macroPreference: MacroPreference;
  proteinRatio: number;
  carbsRatio: number;
  fatRatio: number;
}

export interface WeeklyCheckInResult {
  calculatedTDEE: number;
  expectedWeeklyChange: number;
  actualWeeklyChange: number;
  newDailyCalories: number;
  adjustmentReason: string;
  newProteinGrams: number;
  newCarbsGrams: number;
  newFatGrams: number;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date, referenceDate: Date = new Date()): number {
  const ageDiffMs = referenceDate.getTime() - dateOfBirth.getTime();
  const ageDate = new Date(ageDiffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg / 0.453592;
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * 
 * Male: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Female: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR({ gender, weightKg, heightCm, ageYears }: BMRInput): number {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
  
  if (gender === 'male') {
    return base + 5;
  } else if (gender === 'female') {
    return base - 161;
  } else {
    // For 'other', use average of male and female
    return base - 78;
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(input: TDEEInput): number {
  const bmr = calculateBMR(input);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / msPerDay);
}

/**
 * Calculate required weekly weight change to hit goal
 */
export function calculateRequiredWeeklyChange(
  currentWeightLbs: number,
  targetWeightLbs: number,
  targetDate: Date
): number {
  const days = daysBetween(new Date(), targetDate);
  const weeks = days / 7;
  
  if (weeks <= 0) return 0;
  
  const totalChange = targetWeightLbs - currentWeightLbs;
  return totalChange / weeks;
}

/**
 * Validate if a weight loss/gain goal is realistic and safe
 */
export function validateGoalSafety(weeklyChange: number): {
  isSafe: boolean;
  isRealistic: boolean;
  message: string;
} {
  const absChange = Math.abs(weeklyChange);
  
  if (weeklyChange < 0) {
    // Weight loss
    if (absChange > MAX_WEEKLY_LOSS_LBS * 1.5) {
      return {
        isSafe: false,
        isRealistic: false,
        message: `Losing ${absChange.toFixed(1)} lbs/week is extremely dangerous and unrealistic. Maximum recommended is ${MAX_WEEKLY_LOSS_LBS} lbs/week.`,
      };
    } else if (absChange > MAX_WEEKLY_LOSS_LBS) {
      return {
        isSafe: false,
        isRealistic: true,
        message: `Losing ${absChange.toFixed(1)} lbs/week is aggressive and may not be sustainable. Consider a more gradual approach.`,
      };
    }
  } else if (weeklyChange > 0) {
    // Weight gain
    if (absChange > MAX_WEEKLY_GAIN_LBS * 1.5) {
      return {
        isSafe: false,
        isRealistic: false,
        message: `Gaining ${absChange.toFixed(1)} lbs/week will likely result in excessive fat gain. Maximum recommended is ${MAX_WEEKLY_GAIN_LBS} lb/week.`,
      };
    } else if (absChange > MAX_WEEKLY_GAIN_LBS) {
      return {
        isSafe: false,
        isRealistic: true,
        message: `Gaining ${absChange.toFixed(1)} lbs/week is aggressive. Consider a slower approach for lean gains.`,
      };
    }
  }
  
  return {
    isSafe: true,
    isRealistic: true,
    message: 'Your goal is realistic and safe.',
  };
}

/**
 * Calculate daily calorie target based on goal
 */
export function calculateDailyCalorieTarget({
  tdee,
  currentWeightLbs,
  targetWeightLbs,
  targetDate,
  gender,
}: GoalCalculationInput): {
  dailyCalories: number;
  weeklyChange: number;
  dailyDeficitSurplus: number;
} {
  const weeklyChange = calculateRequiredWeeklyChange(currentWeightLbs, targetWeightLbs, targetDate);
  
  // Convert weekly weight change to daily calorie adjustment
  // 1 lb = 3500 calories, so weekly change * 3500 / 7 = daily adjustment
  const dailyDeficitSurplus = (weeklyChange * CALORIES_PER_POUND) / 7;
  
  let dailyCalories = Math.round(tdee + dailyDeficitSurplus);
  
  // Apply minimum calorie floors
  const minCalories = gender === 'male' ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE;
  if (dailyCalories < minCalories) {
    dailyCalories = minCalories;
  }
  
  return {
    dailyCalories,
    weeklyChange,
    dailyDeficitSurplus,
  };
}

/**
 * Calculate macro gram targets from calories and ratios
 */
export function calculateMacroGrams(
  dailyCalories: number,
  proteinRatio: number,
  carbsRatio: number,
  fatRatio: number
): { proteinGrams: number; carbsGrams: number; fatGrams: number } {
  // Normalize ratios to ensure they sum to 1
  const total = proteinRatio + carbsRatio + fatRatio;
  const normalizedProtein = proteinRatio / total;
  const normalizedCarbs = carbsRatio / total;
  const normalizedFat = fatRatio / total;
  
  return {
    proteinGrams: Math.round((dailyCalories * normalizedProtein) / CALORIES_PER_GRAM.protein),
    carbsGrams: Math.round((dailyCalories * normalizedCarbs) / CALORIES_PER_GRAM.carbs),
    fatGrams: Math.round((dailyCalories * normalizedFat) / CALORIES_PER_GRAM.fat),
  };
}

/**
 * Get macro targets based on preference and calorie target
 */
export function getMacroTargets(
  dailyCalories: number,
  preference: MacroPreference,
  customRatios?: { protein: number; carbs: number; fat: number }
): MacroTargets {
  const ratios = preference === 'manual' && customRatios 
    ? customRatios 
    : MACRO_PRESETS[preference];
  
  const grams = calculateMacroGrams(
    dailyCalories,
    ratios.protein,
    ratios.carbs,
    ratios.fat
  );
  
  return {
    dailyCalories,
    ...grams,
  };
}

/**
 * Calculate true TDEE from actual intake and weight change
 * 
 * Formula: True TDEE = Average Daily Intake - (Weight Change in lbs × 3500 / 7)
 * 
 * If you ate 2000 cal/day and lost 1 lb, your true TDEE was:
 * 2000 - (-1 × 3500 / 7) = 2000 + 500 = 2500
 */
export function calculateTrueTDEE(
  avgDailyCalories: number,
  weightChangeLbs: number,
  daysTracked: number = 7
): number {
  const dailyCalorieChange = (weightChangeLbs * CALORIES_PER_POUND) / daysTracked;
  return Math.round(avgDailyCalories - dailyCalorieChange);
}

/**
 * Weekly check-in algorithm
 * Adjusts calorie targets based on actual progress vs expected progress
 */
export function performWeeklyCheckIn(input: WeeklyCheckInInput): WeeklyCheckInResult {
  const {
    previousWeight,
    currentWeight,
    avgDailyCalories,
    currentDailyTarget,
    targetWeightLbs,
    targetDate,
    proteinRatio,
    carbsRatio,
    fatRatio,
  } = input;
  
  // Calculate actual weight change
  const actualWeeklyChange = currentWeight - previousWeight;
  
  // Calculate what the expected change should have been
  const expectedWeeklyChange = calculateRequiredWeeklyChange(
    previousWeight,
    targetWeightLbs,
    targetDate
  );
  
  // Calculate true TDEE from this week's data
  const calculatedTDEE = calculateTrueTDEE(avgDailyCalories, actualWeeklyChange);
  
  // Determine adjustment needed
  let newDailyCalories = currentDailyTarget;
  let adjustmentReason = '';
  
  const tolerance = 0.2; // Allow 0.2 lbs tolerance
  
  if (expectedWeeklyChange < 0) {
    // Goal is to lose weight
    if (actualWeeklyChange > expectedWeeklyChange + tolerance) {
      // Lost less than expected (or gained)
      newDailyCalories = currentDailyTarget - 100;
      adjustmentReason = `Lost less than expected. Reducing daily calories by 100.`;
    } else if (actualWeeklyChange < expectedWeeklyChange - tolerance) {
      // Lost more than expected
      newDailyCalories = currentDailyTarget + 100;
      adjustmentReason = `Lost more than expected. Increasing daily calories by 100 to prevent too rapid loss.`;
    } else {
      adjustmentReason = `On track! No adjustment needed.`;
    }
  } else if (expectedWeeklyChange > 0) {
    // Goal is to gain weight
    if (actualWeeklyChange < expectedWeeklyChange - tolerance) {
      // Gained less than expected
      newDailyCalories = currentDailyTarget + 100;
      adjustmentReason = `Gained less than expected. Increasing daily calories by 100.`;
    } else if (actualWeeklyChange > expectedWeeklyChange + tolerance) {
      // Gained more than expected
      newDailyCalories = currentDailyTarget - 100;
      adjustmentReason = `Gained more than expected. Reducing daily calories by 100.`;
    } else {
      adjustmentReason = `On track! No adjustment needed.`;
    }
  } else {
    // Maintenance
    if (Math.abs(actualWeeklyChange) > tolerance) {
      if (actualWeeklyChange > 0) {
        newDailyCalories = currentDailyTarget - 50;
        adjustmentReason = `Weight increased slightly. Reducing calories by 50.`;
      } else {
        newDailyCalories = currentDailyTarget + 50;
        adjustmentReason = `Weight decreased slightly. Increasing calories by 50.`;
      }
    } else {
      adjustmentReason = `Maintaining weight. No adjustment needed.`;
    }
  }
  
  // Calculate new macro targets
  const newMacros = calculateMacroGrams(
    newDailyCalories,
    proteinRatio,
    carbsRatio,
    fatRatio
  );
  
  return {
    calculatedTDEE,
    expectedWeeklyChange,
    actualWeeklyChange,
    newDailyCalories,
    adjustmentReason,
    newProteinGrams: newMacros.proteinGrams,
    newCarbsGrams: newMacros.carbsGrams,
    newFatGrams: newMacros.fatGrams,
  };
}

/**
 * Determine if a weekly check-in is available
 */
export function isCheckInAvailable(lastCheckInDate: Date | null): boolean {
  if (!lastCheckInDate) return true;
  
  const daysSinceCheckIn = daysBetween(lastCheckInDate, new Date());
  return daysSinceCheckIn >= 7;
}

/**
 * Get days until next check-in
 */
export function daysUntilCheckIn(lastCheckInDate: Date | null): number {
  if (!lastCheckInDate) return 0;
  
  const daysSinceCheckIn = daysBetween(lastCheckInDate, new Date());
  return Math.max(0, 7 - daysSinceCheckIn);
}
