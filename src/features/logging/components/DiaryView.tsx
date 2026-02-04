'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SignOutButton } from '@/features/auth';
import { FoodSearch } from '@/features/food-search';
import type { Log } from '@/lib/supabase/database.types';

interface DiaryViewProps {
  logs: (Log & { food: { name: string; serving_size: number; serving_unit: string; brand: string | null } | null })[];
  selectedDate: string;
  goals: {
    daily_calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  } | null;
}

export function DiaryView({ logs: initialLogs, selectedDate, goals }: DiaryViewProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [logs, setLogs] = useState(initialLogs);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDateChange = (newDate: string) => {
    router.push(`/diary?date=${newDate}`);
  };

  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    handleDateChange(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    handleDateChange(date.toISOString().split('T')[0]);
  };

  const handleDeleteLog = async (logId: string) => {
    setDeletingId(logId);
    
    try {
      const { error } = await supabase
        .from('logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      setLogs(prev => prev.filter(log => log.id !== logId));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFoodLogged = (newLog: Log & { food: { name: string; serving_size: number; serving_unit: string } | null }) => {
    setLogs(prev => [...prev, { ...newLog, food: newLog.food ? { ...newLog.food, brand: null } : null }]);
    setShowFoodSearch(false);
  };

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isFuture = new Date(selectedDate) > new Date();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <span className="text-xl font-bold text-gray-800">MacroWeb</span>
              </Link>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Date navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none cursor-pointer text-center"
              />
              <p className="text-sm text-gray-500">
                {isToday ? 'Today' : formatDate(selectedDate)}
              </p>
            </div>
            
            <button
              onClick={handleNextDay}
              disabled={isFuture}
              className={`p-2 rounded-lg transition-colors ${
                isFuture ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Summary</h2>
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{Math.round(totals.calories)}</p>
              <p className="text-sm text-gray-500">Calories</p>
              {goals && (
                <p className={`text-xs ${totals.calories > goals.daily_calories ? 'text-red-500' : 'text-gray-400'}`}>
                  / {Math.round(goals.daily_calories)}
                </p>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{Math.round(totals.protein)}g</p>
              <p className="text-sm text-gray-500">Protein</p>
              {goals && (
                <p className="text-xs text-gray-400">/ {Math.round(goals.protein_grams)}g</p>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{Math.round(totals.carbs)}g</p>
              <p className="text-sm text-gray-500">Carbs</p>
              {goals && (
                <p className="text-xs text-gray-400">/ {Math.round(goals.carbs_grams)}g</p>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-600">{Math.round(totals.fat)}g</p>
              <p className="text-sm text-gray-500">Fat</p>
              {goals && (
                <p className="text-xs text-gray-400">/ {Math.round(goals.fat_grams)}g</p>
              )}
            </div>
          </div>
        </div>

        {/* Food log by meal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Food Log</h2>
            {!isFuture && (
              <button
                onClick={() => setShowFoodSearch(true)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <span>+</span> Add Food
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-gray-600 mb-2">No foods logged for this day</p>
              {!isFuture && (
                <button
                  onClick={() => setShowFoodSearch(true)}
                  className="text-emerald-600 font-medium hover:text-emerald-700"
                >
                  Add your first entry →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
                const mealLogs = logs.filter((l) => l.meal_type === mealType);
                if (mealLogs.length === 0) return null;

                const mealTotals = mealLogs.reduce(
                  (acc, log) => ({
                    calories: acc.calories + log.calories,
                  }),
                  { calories: 0 }
                );

                return (
                  <div key={mealType}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        {mealType}
                      </h3>
                      <span className="text-sm text-gray-400">
                        {Math.round(mealTotals.calories)} kcal
                      </span>
                    </div>
                    <div className="space-y-2">
                      {mealLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {log.food?.name || 'Unknown Food'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {log.servings} × {log.food?.serving_size}{log.food?.serving_unit}
                              {log.food?.brand && ` • ${log.food.brand}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">{Math.round(log.calories)} kcal</p>
                              <p className="text-xs text-gray-500">
                                P: {Math.round(log.protein)}g | C: {Math.round(log.carbs)}g | F: {Math.round(log.fat)}g
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              disabled={deletingId === log.id}
                              className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              {deletingId === log.id ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-emerald-600 font-medium hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>

      {/* Food search modal */}
      {showFoodSearch && (
        <FoodSearch
          onClose={() => setShowFoodSearch(false)}
          onFoodLogged={handleFoodLogged}
        />
      )}
    </div>
  );
}
