-- MacroWeb Database Schema
-- Run this in Supabase SQL Editor
-- NOTE: This will DROP existing tables. Remove DROP statements if you want to preserve data.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DROP EXISTING TABLES (comment out if preserving data)
-- =============================================
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.weight_history CASCADE;
DROP TABLE IF EXISTS public.logs CASCADE;
DROP TABLE IF EXISTS public.user_phones CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;

-- =============================================
-- GLOBAL FOODS TABLE (Wikipedia Model)
-- =============================================
-- This is the shared food database that all users contribute to
CREATE TABLE public.foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT UNIQUE,
    serving_size DECIMAL(10, 2) NOT NULL DEFAULT 100,
    serving_unit TEXT NOT NULL DEFAULT 'g',
    calories DECIMAL(10, 2) NOT NULL,
    protein DECIMAL(10, 2) NOT NULL DEFAULT 0,
    carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fat DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fiber DECIMAL(10, 2) DEFAULT 0,
    sugar DECIMAL(10, 2) DEFAULT 0,
    sodium DECIMAL(10, 2) DEFAULT 0,
    food_source TEXT NOT NULL DEFAULT 'user',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for fast searching
CREATE INDEX idx_foods_name ON public.foods USING gin(to_tsvector('english', name));
CREATE INDEX idx_foods_barcode ON public.foods(barcode);
CREATE INDEX idx_foods_source ON public.foods(food_source);

-- =============================================
-- USER GOALS TABLE
-- =============================================
-- Stores user's weight goals, macro preferences, and calculated targets
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Baseline data (from onboarding)
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    height_cm DECIMAL(5, 2) NOT NULL,
    date_of_birth DATE NOT NULL,
    activity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    
    -- Weight data
    starting_weight DECIMAL(5, 2) NOT NULL,
    current_weight DECIMAL(5, 2) NOT NULL,
    target_weight DECIMAL(5, 2) NOT NULL,
    target_date DATE NOT NULL,
    
    -- Goal type
    goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
    
    -- Macro preference
    macro_preference TEXT NOT NULL DEFAULT 'balanced' CHECK (macro_preference IN ('balanced', 'high_protein', 'low_carb', 'keto', 'manual')),
    protein_ratio DECIMAL(3, 2) NOT NULL DEFAULT 0.30,
    carbs_ratio DECIMAL(3, 2) NOT NULL DEFAULT 0.35,
    fat_ratio DECIMAL(3, 2) NOT NULL DEFAULT 0.35,
    
    -- Calculated targets (updated weekly)
    tdee DECIMAL(8, 2) NOT NULL,
    daily_calories DECIMAL(8, 2) NOT NULL,
    protein_grams DECIMAL(6, 2) NOT NULL,
    carbs_grams DECIMAL(6, 2) NOT NULL,
    fat_grams DECIMAL(6, 2) NOT NULL,
    
    -- Check-in tracking
    last_check_in DATE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);

-- =============================================
-- FOOD LOGS TABLE
-- =============================================
-- Links foods to users for their daily diary
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL DEFAULT 'snack' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    
    -- Quantity consumed (multiplier of serving size)
    servings DECIMAL(6, 2) NOT NULL DEFAULT 1,
    
    -- Cached nutrition values at time of logging
    calories DECIMAL(10, 2) NOT NULL,
    protein DECIMAL(10, 2) NOT NULL,
    carbs DECIMAL(10, 2) NOT NULL,
    fat DECIMAL(10, 2) NOT NULL,
    
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_date ON public.logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_logs_food ON public.logs(food_id);

-- =============================================
-- WEIGHT HISTORY TABLE
-- =============================================
-- Track weight over time for TDEE calculations
CREATE TABLE IF NOT EXISTS public.weight_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weight DECIMAL(5, 2) NOT NULL,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_user_date ON public.weight_history(user_id, logged_date DESC);

-- =============================================
-- CHECK-IN HISTORY TABLE
-- =============================================
-- Store weekly check-in data and adjustments
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Weight at check-in
    weight DECIMAL(5, 2) NOT NULL,
    previous_weight DECIMAL(5, 2) NOT NULL,
    weight_change DECIMAL(5, 2) NOT NULL,
    
    -- Intake for the week
    avg_daily_calories DECIMAL(8, 2) NOT NULL,
    
    -- Calculated true TDEE
    calculated_tdee DECIMAL(8, 2) NOT NULL,
    
    -- Goal tracking
    expected_weekly_change DECIMAL(5, 2) NOT NULL,
    actual_weekly_change DECIMAL(5, 2) NOT NULL,
    
    -- Adjustment made
    old_daily_calories DECIMAL(8, 2) NOT NULL,
    new_daily_calories DECIMAL(8, 2) NOT NULL,
    adjustment_reason TEXT,
    
    -- New macro targets
    new_protein_grams DECIMAL(6, 2) NOT NULL,
    new_carbs_grams DECIMAL(6, 2) NOT NULL,
    new_fat_grams DECIMAL(6, 2) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.check_ins(user_id, check_in_date DESC);

-- =============================================
-- USER PHONE NUMBERS (for SMS logging)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_phones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phones_number ON public.user_phones(phone_number);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

-- Foods: Everyone can read, authenticated users can insert
CREATE POLICY "Foods are viewable by everyone" ON public.foods
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert foods" ON public.foods
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own foods" ON public.foods
    FOR UPDATE USING (auth.uid() = created_by);

-- Goals: Users can only access their own goals
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Logs: Users can only access their own logs
CREATE POLICY "Users can view own logs" ON public.logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON public.logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON public.logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs" ON public.logs
    FOR DELETE USING (auth.uid() = user_id);

-- Weight History: Users can only access their own weight history
CREATE POLICY "Users can view own weight history" ON public.weight_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON public.weight_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight history" ON public.weight_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Check-ins: Users can only access their own check-ins
CREATE POLICY "Users can view own check-ins" ON public.check_ins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins" ON public.check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Phones: Users can only access their own phone
CREATE POLICY "Users can view own phone" ON public.user_phones
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone" ON public.user_phones
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone" ON public.user_phones
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_foods_updated_at
    BEFORE UPDATE ON public.foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
