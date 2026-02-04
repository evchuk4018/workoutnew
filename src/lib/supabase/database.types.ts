/**
 * Database types for Supabase
 * Auto-generated types for MacroWeb database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      foods: {
        Row: {
          id: string
          name: string
          brand: string | null
          barcode: string | null
          serving_size: number
          serving_unit: string
          calories: number
          protein: number
          carbs: number
          fat: number
          fiber: number | null
          sugar: number | null
          sodium: number | null
          source: 'user' | 'barcode' | 'ai' | 'usda'
          created_by: string | null
          created_at: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          barcode?: string | null
          serving_size?: number
          serving_unit?: string
          calories: number
          protein?: number
          carbs?: number
          fat?: number
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          source?: 'user' | 'barcode' | 'ai' | 'usda'
          created_by?: string | null
          created_at?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          barcode?: string | null
          serving_size?: number
          serving_unit?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          source?: 'user' | 'barcode' | 'ai' | 'usda'
          created_by?: string | null
          created_at?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          gender: 'male' | 'female' | 'other'
          height_cm: number
          date_of_birth: string
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
          starting_weight: number
          current_weight: number
          target_weight: number
          target_date: string
          goal_type: 'lose' | 'maintain' | 'gain'
          macro_preference: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'manual'
          protein_ratio: number
          carbs_ratio: number
          fat_ratio: number
          tdee: number
          daily_calories: number
          protein_grams: number
          carbs_grams: number
          fat_grams: number
          last_check_in: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gender: 'male' | 'female' | 'other'
          height_cm: number
          date_of_birth: string
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
          starting_weight: number
          current_weight: number
          target_weight: number
          target_date: string
          goal_type: 'lose' | 'maintain' | 'gain'
          macro_preference?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'manual'
          protein_ratio?: number
          carbs_ratio?: number
          fat_ratio?: number
          tdee: number
          daily_calories: number
          protein_grams: number
          carbs_grams: number
          fat_grams: number
          last_check_in?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gender?: 'male' | 'female' | 'other'
          height_cm?: number
          date_of_birth?: string
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
          starting_weight?: number
          current_weight?: number
          target_weight?: number
          target_date?: string
          goal_type?: 'lose' | 'maintain' | 'gain'
          macro_preference?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'manual'
          protein_ratio?: number
          carbs_ratio?: number
          fat_ratio?: number
          tdee?: number
          daily_calories?: number
          protein_grams?: number
          carbs_grams?: number
          fat_grams?: number
          last_check_in?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          id: string
          user_id: string
          food_id: string
          log_date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings: number
          calories: number
          protein: number
          carbs: number
          fat: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_id: string
          log_date?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings?: number
          calories: number
          protein: number
          carbs: number
          fat: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string
          log_date?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings?: number
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          id: string
          user_id: string
          weight: number
          logged_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight: number
          logged_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight?: number
          logged_date?: string
          created_at?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          id: string
          user_id: string
          check_in_date: string
          weight: number
          previous_weight: number
          weight_change: number
          avg_daily_calories: number
          calculated_tdee: number
          expected_weekly_change: number
          actual_weekly_change: number
          old_daily_calories: number
          new_daily_calories: number
          adjustment_reason: string | null
          new_protein_grams: number
          new_carbs_grams: number
          new_fat_grams: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          check_in_date?: string
          weight: number
          previous_weight: number
          weight_change: number
          avg_daily_calories: number
          calculated_tdee: number
          expected_weekly_change: number
          actual_weekly_change: number
          old_daily_calories: number
          new_daily_calories: number
          adjustment_reason?: string | null
          new_protein_grams: number
          new_carbs_grams: number
          new_fat_grams: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_in_date?: string
          weight?: number
          previous_weight?: number
          weight_change?: number
          avg_daily_calories?: number
          calculated_tdee?: number
          expected_weekly_change?: number
          actual_weekly_change?: number
          old_daily_calories?: number
          new_daily_calories?: number
          adjustment_reason?: string | null
          new_protein_grams?: number
          new_carbs_grams?: number
          new_fat_grams?: number
          created_at?: string
        }
        Relationships: []
      }
      user_phones: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone_number: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone_number?: string
          verified?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Food = Database['public']['Tables']['foods']['Row'];
export type FoodInsert = Database['public']['Tables']['foods']['Insert'];
export type Goals = Database['public']['Tables']['goals']['Row'];
export type GoalsInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalsUpdate = Database['public']['Tables']['goals']['Update'];
export type Log = Database['public']['Tables']['logs']['Row'];
export type LogInsert = Database['public']['Tables']['logs']['Insert'];
export type WeightHistory = Database['public']['Tables']['weight_history']['Row'];
export type WeightHistoryInsert = Database['public']['Tables']['weight_history']['Insert'];
export type CheckIn = Database['public']['Tables']['check_ins']['Row'];
export type CheckInInsert = Database['public']['Tables']['check_ins']['Insert'];
