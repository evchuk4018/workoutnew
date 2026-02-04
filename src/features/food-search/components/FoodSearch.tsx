'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Food, Log, LogInsert } from '@/lib/supabase/database.types';

interface FoodSearchProps {
  onClose: () => void;
  onFoodLogged: (log: Log & { food: { name: string; serving_size: number; serving_unit: string } | null }) => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function FoodSearch({ onClose, onFoodLogged }: FoodSearchProps) {
  const supabase = createClient();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [error, setError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const searchFoods = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (searchError) throw searchError;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search foods');
    } finally {
      setIsSearching(false);
    }
  }, [supabase]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchFoods(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, searchFoods]);

  const generateWithAI = async () => {
    if (!query.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate food');
      }

      const { food } = await response.json();
      setSelectedFood(food);
      setResults([food, ...results]);
    } catch (err) {
      console.error('AI generation error:', err);
      setError('Failed to generate nutrition data. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const logFood = async () => {
    if (!selectedFood) return;

    setIsLogging(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const logData: LogInsert = {
        user_id: user.id,
        food_id: selectedFood.id,
        meal_type: mealType,
        servings,
        calories: selectedFood.calories * servings,
        protein: selectedFood.protein * servings,
        carbs: selectedFood.carbs * servings,
        fat: selectedFood.fat * servings,
      };

      const { data, error: logError } = await supabase
        .from('logs')
        .insert(logData as never)
        .select(`
          *,
          food:foods(name, serving_size, serving_unit)
        `)
        .single();

      if (logError) throw logError;

      onFoodLogged(data);
    } catch (err) {
      console.error('Log error:', err);
      setError('Failed to log food. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const calculatedNutrition = selectedFood
    ? {
        calories: selectedFood.calories * servings,
        protein: selectedFood.protein * servings,
        carbs: selectedFood.carbs * servings,
        fat: selectedFood.fat * servings,
      }
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Food</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a food..."
              className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedFood ? (
            <>
              {/* Search results */}
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-500 mt-2">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{food.name}</p>
                          <p className="text-sm text-gray-500">
                            {food.serving_size} {food.serving_unit}
                            {food.brand && ` • ${food.brand}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{Math.round(food.calories)} kcal</p>
                          <p className="text-xs text-gray-500">
                            P: {Math.round(food.protein)}g • C: {Math.round(food.carbs)}g • F: {Math.round(food.fat)}g
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="p-8 text-center">
                  <span className="text-4xl mb-4 block">🔍</span>
                  <p className="text-gray-600 mb-4">No foods found for &quot;{query}&quot;</p>
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        Generate &quot;{query}&quot; with AI
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Start typing to search for foods
                </div>
              )}
            </>
          ) : (
            /* Food details & logging */
            <div className="p-4 space-y-4">
              <button
                onClick={() => setSelectedFood(null)}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
              >
                ← Back to search
              </button>

              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 text-lg">{selectedFood.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedFood.serving_size} {selectedFood.serving_unit}
                  {selectedFood.source === 'ai' && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      AI Generated
                    </span>
                  )}
                </p>
              </div>

              {/* Servings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Servings
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setServings(Math.max(0.25, servings - 0.25))}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-center font-medium"
                    step={0.25}
                    min={0.25}
                  />
                  <button
                    onClick={() => setServings(servings + 0.25)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Meal type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setMealType(meal)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                        mealType === meal
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {meal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition preview */}
              {calculatedNutrition && (
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-600 font-medium mb-2">This will add:</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">
                        {Math.round(calculatedNutrition.calories)}
                      </p>
                      <p className="text-xs text-emerald-600">kcal</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(calculatedNutrition.protein)}g
                      </p>
                      <p className="text-xs text-blue-500">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {Math.round(calculatedNutrition.carbs)}g
                      </p>
                      <p className="text-xs text-amber-500">Carbs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-pink-600">
                        {Math.round(calculatedNutrition.fat)}g
                      </p>
                      <p className="text-xs text-pink-500">Fat</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedFood && (
          <div className="p-4 border-t border-gray-100">
            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}
            <button
              onClick={logFood}
              disabled={isLogging}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLogging ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Logging...
                </>
              ) : (
                'Log Food'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
