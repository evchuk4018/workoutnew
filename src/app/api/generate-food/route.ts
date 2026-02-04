import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFoodNutrition } from '@/lib/gemini';
import type { FoodInsert } from '@/lib/supabase/database.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { foodName } = await request.json();
    
    if (!foodName || typeof foodName !== 'string') {
      return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
    }

    // Generate nutrition data with AI
    const generatedFood = await generateFoodNutrition(foodName);

    // Insert into global foods table
    const foodData: FoodInsert = {
      name: generatedFood.name,
      serving_size: generatedFood.serving_size,
      serving_unit: generatedFood.serving_unit,
      calories: generatedFood.calories,
      protein: generatedFood.protein,
      carbs: generatedFood.carbs,
      fat: generatedFood.fat,
      source: 'ai',
      created_by: user.id,
    };
    const { data: food, error: insertError } = await supabase
      .from('foods')
      .insert(foodData as never)
      .select()
      .single();

    if (insertError) {
      // If duplicate, try to find existing
      if (insertError.code === '23505') {
        const { data: existingFood } = await supabase
          .from('foods')
          .select()
          .ilike('name', generatedFood.name)
          .limit(1)
          .single();
        
        if (existingFood) {
          return NextResponse.json({ food: existingFood });
        }
      }
      throw insertError;
    }

    return NextResponse.json({ food });
  } catch (error) {
    console.error('Error generating food:', error);
    return NextResponse.json(
      { error: 'Failed to generate food nutrition data' },
      { status: 500 }
    );
  }
}
