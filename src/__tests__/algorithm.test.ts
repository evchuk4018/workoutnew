import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateAge,
  lbsToKg,
  kgToLbs,
  feetInchesToCm,
  calculateDailyCalorieTarget,
  calculateMacroGrams,
  getMacroTargets,
  performWeeklyCheckIn,
  calculateTrueTDEE,
  validateGoalSafety,
  isCheckInAvailable,
  daysUntilCheckIn,
  daysBetween,
  MACRO_PRESETS,
} from '@/lib/algorithm';

describe('Algorithm Library', () => {
  describe('Unit Conversions', () => {
    it('converts pounds to kilograms correctly', () => {
      expect(lbsToKg(100)).toBeCloseTo(45.36, 1);
      expect(lbsToKg(180)).toBeCloseTo(81.65, 1);
    });

    it('converts kilograms to pounds correctly', () => {
      expect(kgToLbs(45.36)).toBeCloseTo(100, 0);
      expect(kgToLbs(81.65)).toBeCloseTo(180, 0);
    });

    it('converts feet and inches to centimeters', () => {
      expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 1);
      expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 1);
    });
  });

  describe('Age Calculation', () => {
    it('calculates age correctly', () => {
      const today = new Date('2026-02-04');
      const dob = new Date('1990-01-01');
      expect(calculateAge(dob, today)).toBe(36);
    });

    it('handles birthdays correctly', () => {
      const today = new Date('2026-02-04');
      const dob = new Date('1990-03-01'); // Birthday hasn't happened yet
      expect(calculateAge(dob, today)).toBe(35);
    });
  });

  describe('BMR Calculation (Mifflin-St Jeor)', () => {
    it('calculates BMR for males correctly', () => {
      const bmr = calculateBMR({
        gender: 'male',
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      });
      // (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBe(1780);
    });

    it('calculates BMR for females correctly', () => {
      const bmr = calculateBMR({
        gender: 'female',
        weightKg: 65,
        heightCm: 165,
        ageYears: 28,
      });
      // (10 × 65) + (6.25 × 165) - (5 × 28) - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
      expect(bmr).toBeCloseTo(1380.25, 1);
    });
  });

  describe('TDEE Calculation', () => {
    it('applies activity multipliers correctly', () => {
      const base = {
        gender: 'male' as const,
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      };

      const sedentaryTDEE = calculateTDEE({ ...base, activityLevel: 'sedentary' });
      const activeTDEE = calculateTDEE({ ...base, activityLevel: 'active' });

      // Sedentary: 1780 * 1.2 = 2136
      expect(sedentaryTDEE).toBe(2136);
      // Active: 1780 * 1.725 = 3071
      expect(activeTDEE).toBe(3070); // Rounding
    });
  });

  describe('Macro Calculations', () => {
    it('calculates macro grams correctly for high protein preset', () => {
      const macros = getMacroTargets(2000, 'high_protein');
      
      // High protein: 40% protein, 30% carbs, 30% fat
      // Protein: 2000 * 0.4 / 4 = 200g
      // Carbs: 2000 * 0.3 / 4 = 150g
      // Fat: 2000 * 0.3 / 9 = 67g
      expect(macros.proteinGrams).toBe(200);
      expect(macros.carbsGrams).toBe(150);
      expect(macros.fatGrams).toBe(67);
    });

    it('calculates macro grams for balanced preset', () => {
      const macros = getMacroTargets(2000, 'balanced');
      
      // Balanced: 30% protein, 35% carbs, 35% fat
      // Protein: 2000 * 0.3 / 4 = 150g
      // Carbs: 2000 * 0.35 / 4 = 175g
      // Fat: 2000 * 0.35 / 9 = 78g
      expect(macros.proteinGrams).toBe(150);
      expect(macros.carbsGrams).toBe(175);
      expect(macros.fatGrams).toBe(78);
    });

    it('handles custom ratios correctly', () => {
      const macros = getMacroTargets(2000, 'manual', {
        protein: 0.45,
        carbs: 0.25,
        fat: 0.30,
      });
      
      // Custom: 45% protein, 25% carbs, 30% fat
      expect(macros.proteinGrams).toBe(225); // 2000 * 0.45 / 4
      expect(macros.carbsGrams).toBe(125);   // 2000 * 0.25 / 4
      expect(macros.fatGrams).toBe(67);      // 2000 * 0.30 / 9
    });
  });

  describe('Daily Calorie Target', () => {
    it('calculates deficit for weight loss', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 70); // 10 weeks

      const result = calculateDailyCalorieTarget({
        tdee: 2500,
        currentWeightLbs: 200,
        targetWeightLbs: 190, // 10 lbs loss in 10 weeks = 1 lb/week
        targetDate,
        gender: 'male',
      });

      // 1 lb/week = 500 cal/day deficit
      expect(result.dailyCalories).toBeCloseTo(2000, -1);
      expect(result.weeklyChange).toBeCloseTo(-1, 0);
    });

    it('respects minimum calorie floors', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14); // 2 weeks

      const result = calculateDailyCalorieTarget({
        tdee: 1800,
        currentWeightLbs: 200,
        targetWeightLbs: 180, // Unrealistic: 20 lbs in 2 weeks
        targetDate,
        gender: 'female',
      });

      // Should be capped at minimum for females (1200)
      expect(result.dailyCalories).toBe(1200);
    });
  });

  describe('Goal Safety Validation', () => {
    it('flags unsafe weight loss goals', () => {
      const result = validateGoalSafety(-3); // 3 lbs/week loss
      expect(result.isSafe).toBe(false);
      expect(result.message).toContain('dangerous');
    });

    it('allows safe weight loss goals', () => {
      const result = validateGoalSafety(-1.5);
      expect(result.isRealistic).toBe(true);
    });

    it('flags unsafe weight gain goals', () => {
      const result = validateGoalSafety(2); // 2 lbs/week gain
      expect(result.isSafe).toBe(false);
    });
  });

  describe('True TDEE Calculation', () => {
    it('calculates true TDEE from actual data', () => {
      // Ate 2000 cal/day, lost 1 lb in a week
      // True TDEE = 2000 - (-1 * 3500 / 7) = 2000 + 500 = 2500
      const trueTDEE = calculateTrueTDEE(2000, -1, 7);
      expect(trueTDEE).toBe(2500);
    });

    it('handles weight gain scenario', () => {
      // Ate 3000 cal/day, gained 1 lb in a week
      // True TDEE = 3000 - (1 * 3500 / 7) = 3000 - 500 = 2500
      const trueTDEE = calculateTrueTDEE(3000, 1, 7);
      expect(trueTDEE).toBe(2500);
    });
  });

  describe('Weekly Check-In Algorithm', () => {
    it('recommends lowering calories when losing too slow', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 70);

      const result = performWeeklyCheckIn({
        previousWeight: 200,
        currentWeight: 200, // No change
        avgDailyCalories: 2000,
        currentDailyTarget: 2000,
        targetWeightLbs: 190,
        targetDate,
        macroPreference: 'balanced',
        proteinRatio: 0.3,
        carbsRatio: 0.35,
        fatRatio: 0.35,
      });

      expect(result.newDailyCalories).toBe(1900); // Reduced by 100
      expect(result.adjustmentReason).toContain('less than expected');
    });

    it('recommends increasing calories when losing too fast', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 70);

      const result = performWeeklyCheckIn({
        previousWeight: 200,
        currentWeight: 197, // Lost 3 lbs (too fast)
        avgDailyCalories: 1800,
        currentDailyTarget: 2000,
        targetWeightLbs: 190,
        targetDate,
        macroPreference: 'balanced',
        proteinRatio: 0.3,
        carbsRatio: 0.35,
        fatRatio: 0.35,
      });

      expect(result.newDailyCalories).toBe(2100); // Increased by 100
      expect(result.adjustmentReason).toContain('more than expected');
    });

    it('makes no adjustment when on track', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 70);

      const result = performWeeklyCheckIn({
        previousWeight: 200,
        currentWeight: 199, // Lost 1 lb (on track)
        avgDailyCalories: 2000,
        currentDailyTarget: 2000,
        targetWeightLbs: 190,
        targetDate,
        macroPreference: 'balanced',
        proteinRatio: 0.3,
        carbsRatio: 0.35,
        fatRatio: 0.35,
      });

      expect(result.newDailyCalories).toBe(2000); // No change
      expect(result.adjustmentReason).toContain('On track');
    });

    it('recalculates macros with new calorie target', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 70);

      const result = performWeeklyCheckIn({
        previousWeight: 200,
        currentWeight: 200,
        avgDailyCalories: 2000,
        currentDailyTarget: 2000,
        targetWeightLbs: 190,
        targetDate,
        macroPreference: 'high_protein',
        proteinRatio: 0.4,
        carbsRatio: 0.3,
        fatRatio: 0.3,
      });

      // New calories: 1900
      // High protein: 40% protein
      // Expected: 1900 * 0.4 / 4 = 190g
      expect(result.newProteinGrams).toBe(190);
    });
  });

  describe('Check-In Availability', () => {
    it('returns true when no previous check-in', () => {
      expect(isCheckInAvailable(null)).toBe(true);
    });

    it('returns false when checked in less than 7 days ago', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(isCheckInAvailable(threeDaysAgo)).toBe(false);
    });

    it('returns true when checked in 7 or more days ago', () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      expect(isCheckInAvailable(sevenDaysAgo)).toBe(true);
    });
  });

  describe('Days Until Check-In', () => {
    it('returns 0 when check-in is available', () => {
      expect(daysUntilCheckIn(null)).toBe(0);
    });

    it('calculates remaining days correctly', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(daysUntilCheckIn(threeDaysAgo)).toBe(4);
    });
  });
});

describe('Macro Presets', () => {
  it('has all required presets', () => {
    expect(MACRO_PRESETS).toHaveProperty('balanced');
    expect(MACRO_PRESETS).toHaveProperty('high_protein');
    expect(MACRO_PRESETS).toHaveProperty('low_carb');
    expect(MACRO_PRESETS).toHaveProperty('keto');
    expect(MACRO_PRESETS).toHaveProperty('manual');
  });

  it('keto preset has very low carbs', () => {
    expect(MACRO_PRESETS.keto.carbs).toBe(0.05);
    expect(MACRO_PRESETS.keto.fat).toBe(0.65);
  });

  it('all presets sum to 1', () => {
    for (const [name, preset] of Object.entries(MACRO_PRESETS)) {
      const sum = preset.protein + preset.carbs + preset.fat;
      expect(sum).toBeCloseTo(1, 2);
    }
  });
});
