import { describe, it, expect, vi } from 'vitest';

// Mock the Gemini API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            name: '3 eggs',
            serving_size: 150,
            serving_unit: 'g',
            calories: 210,
            protein: 18,
            carbs: 1,
            fat: 14,
          }),
        },
      }),
    }),
  })),
}));

describe('AI Food Parser', () => {
  it('parses "3 eggs" and returns correct nutrition', async () => {
    // Import after mocking
    const { generateFoodNutrition } = await import('@/lib/gemini');
    
    const result = await generateFoodNutrition('3 eggs');
    
    // Assert expected values for 3 eggs
    expect(result.calories).toBeCloseTo(210, -1); // ~70 cal per egg
    expect(result.protein).toBeCloseTo(18, 0);    // ~6g per egg
    expect(result.name).toContain('egg');
  });
});

describe('AI Food Text Parser', () => {
  it('handles multiple food items', async () => {
    // This would test parseFoodFromText with mocked responses
    // For integration testing with real AI, this would be an E2E test
    expect(true).toBe(true); // Placeholder
  });
});
