import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface GeneratedFood {
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Generate nutritional information for a food item using Gemini AI
 */
export async function generateFoodNutrition(foodName: string): Promise<GeneratedFood> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a nutrition database assistant. Generate accurate nutritional information for "${foodName}".

Return ONLY a valid JSON object with no additional text or formatting. The JSON must have this exact structure:
{
  "name": "the food name (properly formatted)",
  "serving_size": number (typical serving size amount),
  "serving_unit": "g" or "ml" or "oz" or "piece" etc,
  "calories": number (kcal per serving),
  "protein": number (grams per serving),
  "carbs": number (grams per serving),
  "fat": number (grams per serving)
}

Be as accurate as possible based on typical nutritional values for this food. If it's a restaurant or branded item, estimate based on similar items.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  
  const parsed = JSON.parse(jsonMatch[0]) as GeneratedFood;
  
  // Validate required fields
  if (!parsed.name || typeof parsed.calories !== 'number') {
    throw new Error('Invalid food data structure from AI');
  }
  
  return parsed;
}

/**
 * Parse natural language food description into structured food items
 * Used for SMS logging feature
 */
export async function parseFoodFromText(text: string): Promise<ParsedFoodItem[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a nutrition assistant. Parse the following food description and extract individual food items with estimated nutritional information.

User input: "${text}"

Return ONLY a valid JSON array with no additional text. Each item must have this structure:
[
  {
    "name": "food item name",
    "quantity": 1,
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams)
  }
]

Parse all food items mentioned. Use typical nutritional values for common foods. If quantities are mentioned (like "3 eggs" or "two slices of pizza"), reflect that in the values.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text_response = response.text();
  
  // Parse JSON from response
  const jsonMatch = text_response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON array');
  }
  
  const parsed = JSON.parse(jsonMatch[0]) as ParsedFoodItem[];
  
  // Validate array
  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not an array');
  }
  
  return parsed;
}

/**
 * Suggest similar foods based on a search query
 */
export async function suggestSimilarFoods(query: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Given the food search query "${query}", suggest 5 similar or related foods that a user might be looking for.

Return ONLY a JSON array of strings with no additional text:
["food 1", "food 2", "food 3", "food 4", "food 5"]`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }
  
  return JSON.parse(jsonMatch[0]) as string[];
}
