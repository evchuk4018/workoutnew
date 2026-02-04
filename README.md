# MacroWeb - Personalized Macro Tracking Application

A full-featured nutrition tracking web application with AI-powered food recognition, personalized macro targets, and weekly progress adjustments.

## 🚀 Features

### Core Features
- **Google OAuth Authentication** - Seamless sign-in with Google
- **Personalized Onboarding** - Set your goals, timeline, and macro preferences
- **TDEE Calculation** - Mifflin-St Jeor equation with activity level adjustments
- **Daily Food Logging** - Track meals with calories and macros
- **Weekly Check-Ins** - Algorithm adjusts your targets based on actual progress

### AI-Powered Features
- **AI Food Generation** - Can't find a food? AI generates accurate nutrition data
- **SMS Logging** - Text your meals to log them automatically (requires SMS provider setup)
- **Smart Search Suggestions** - AI-powered similar food recommendations

### The "Wikipedia" Model
- **Global Food Database** - Foods created by any user are available to all users
- **Community-Driven** - The database grows as users add new foods
- **AI Contributions** - AI-generated foods are permanently stored for everyone

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, RLS)
- **AI**: Google Gemini
- **Testing**: Vitest + Testing Library

## 📦 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── generate-food/ # AI food generation endpoint
│   │   └── sms-log/       # SMS webhook endpoint
│   ├── auth/              # Auth callback
│   ├── check-in/          # Weekly check-in page
│   ├── dashboard/         # Main dashboard
│   ├── diary/             # Food diary page
│   └── onboarding/        # Onboarding wizard
├── features/              # Feature-based modules
│   ├── auth/              # Authentication components
│   ├── check-in/          # Check-in form and logic
│   ├── dashboard/         # Dashboard components
│   ├── food-search/       # Food search with AI
│   ├── logging/           # Diary/logging components
│   └── onboarding/        # Onboarding wizard
├── lib/                   # Shared libraries
│   ├── algorithm/         # TDEE, macro, and check-in algorithms
│   ├── gemini/            # Google Gemini AI integration
│   └── supabase/          # Supabase client and types
└── __tests__/             # Test files
```

## 🗄️ Database Schema

### Tables
- **foods** - Global food database (shared by all users)
- **goals** - User's weight goals, macro preferences, and targets
- **logs** - Daily food log entries
- **weight_history** - Weight tracking over time
- **check_ins** - Weekly check-in records and adjustments
- **user_phones** - Phone numbers for SMS logging

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_AI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Database Setup

Run the SQL schema in your Supabase SQL editor:
```bash
# See supabase/schema.sql
```

### 4. Configure Google OAuth in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google Client ID and Secret
4. Set up redirect URLs

### 5. Run Development Server

```bash
npm run dev
```

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The test suite covers:
- **Algorithm Tests** - BMR, TDEE, macro calculations, weekly check-in logic
- **Validation Tests** - Goal safety validation, date calculations
- **AI Parser Tests** - Food parsing accuracy (mocked)

## 📱 User Flows

### Flow A: Authentication
1. User lands on homepage
2. Signs in with Google
3. Redirected to onboarding (new user) or dashboard (returning user)

### Flow B: Onboarding
1. Enter baseline data (gender, height, weight, DOB)
2. Select goal (lose, maintain, gain)
3. Set target weight and date
4. Choose macro preference
5. Review calculated targets and start tracking

### Flow C: Daily Tracking
1. Log foods throughout the day
2. Track progress toward daily targets
3. View macro breakdown

### Flow D: Weekly Check-In
1. Every 7 days, check-in becomes available
2. Enter current weight
3. System calculates true TDEE from actual data
4. Targets automatically adjusted for optimal progress

### Flow E: AI Food Generation
1. Search for a food not in database
2. Click "Generate with AI"
3. AI creates accurate nutrition data
4. Food is saved to global database
5. Food is logged to user's diary

## 🧮 Algorithm Details

### BMR (Mifflin-St Jeor)
- **Male**: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
- **Female**: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161

### TDEE
TDEE = BMR × Activity Multiplier

| Activity Level | Multiplier |
|----------------|------------|
| Sedentary      | 1.2        |
| Lightly Active | 1.375      |
| Moderately Active | 1.55    |
| Very Active    | 1.725      |
| Extremely Active | 1.9      |

### Weekly Adjustment Logic
1. Calculate actual weight change vs expected
2. Calculate true TDEE from intake and weight change
3. If losing too slow: -100 cal/day
4. If losing too fast: +100 cal/day
5. Recalculate macros with user's preference ratios

## 📄 License

MIT
