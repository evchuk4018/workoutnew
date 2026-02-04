import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseFoodFromText, generateFoodNutrition } from '@/lib/gemini';
import type { Database } from '@/lib/supabase/database.types';

// Use service role for SMS webhook (no user session)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract SMS data (format depends on your SMS provider - Twilio, etc.)
    const { From: phoneNumber, Body: messageBody } = body;
    
    if (!phoneNumber || !messageBody) {
      return NextResponse.json(
        { error: 'Missing phone number or message body' },
        { status: 400 }
      );
    }

    // Look up user by phone number
    const { data: userPhone, error: phoneError } = await supabaseAdmin
      .from('user_phones')
      .select('user_id')
      .eq('phone_number', phoneNumber)
      .single();

    if (phoneError || !userPhone) {
      return NextResponse.json(
        { error: 'Phone number not registered' },
        { status: 404 }
      );
    }

    const userId = userPhone.user_id;

    // Parse food items from the message using AI
    const parsedFoods = await parseFoodFromText(messageBody);

    if (parsedFoods.length === 0) {
      return NextResponse.json(
        { error: 'No food items detected in message' },
        { status: 400 }
      );
    }

    const loggedItems = [];
    const today = new Date().toISOString().split('T')[0];

    for (const parsedFood of parsedFoods) {
      // Check if food exists in database
      let { data: existingFood } = await supabaseAdmin
        .from('foods')
        .select('*')
        .ilike('name', `%${parsedFood.name}%`)
        .limit(1)
        .single();

      // If not found, create it using AI
      if (!existingFood) {
        const generated = await generateFoodNutrition(parsedFood.name);
        
        const { data: newFood } = await supabaseAdmin
          .from('foods')
          .insert({
            name: generated.name,
            serving_size: generated.serving_size,
            serving_unit: generated.serving_unit,
            calories: generated.calories,
            protein: generated.protein,
            carbs: generated.carbs,
            fat: generated.fat,
            source: 'ai',
            created_by: userId,
          })
          .select()
          .single();

        existingFood = newFood;
      }

      if (existingFood) {
        // Log the food
        const { data: log, error: logError } = await supabaseAdmin
          .from('logs')
          .insert({
            user_id: userId,
            food_id: existingFood.id,
            log_date: today,
            meal_type: 'snack', // Default to snack for SMS logs
            servings: parsedFood.quantity,
            calories: existingFood.calories * parsedFood.quantity,
            protein: existingFood.protein * parsedFood.quantity,
            carbs: existingFood.carbs * parsedFood.quantity,
            fat: existingFood.fat * parsedFood.quantity,
            notes: `Logged via SMS: "${messageBody}"`,
          })
          .select()
          .single();

        if (!logError && log) {
          loggedItems.push({
            name: existingFood.name,
            quantity: parsedFood.quantity,
            calories: existingFood.calories * parsedFood.quantity,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Logged ${loggedItems.length} item(s)`,
      items: loggedItems,
    });
  } catch (error) {
    console.error('SMS logging error:', error);
    return NextResponse.json(
      { error: 'Failed to process SMS log' },
      { status: 500 }
    );
  }
}
