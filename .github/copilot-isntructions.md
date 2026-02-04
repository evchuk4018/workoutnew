# Global Design System

## 1. Color Palette

The app is best known for its Dark Mode (default). Use these values for the primary theme.

### Base Colors (Dark Mode)
- **Background (Global):** #000000 (True Black) or #0b0b0b (Deepest Charcoal).
- **Surface (Cards/Sheet):** #161618 (Slightly lighter than bg, provides depth).
- **Divider/Border:** #2C2C2E (Subtle separation).

### Typography Colors
- **Text Primary:** #FFFFFF (100% opacity).
- **Text Secondary:** #A1A1A6 (Light Gray, approx 60% opacity).
- **Text Tertiary/Labels:** #6C6C70 (Dark Gray, approx 40% opacity).

### Brand & Data Colors (The "Expenditure" Palette)
- **Brand Accent (Orange):** #FF6B00 to #FF8800 (Vibrant Tangerine).
- **Success/Hit Target:** #FFFFFF (When a bar hits the goal, it often turns solid white in dark mode).
- **Data Series (Default Macros):**
  - Protein: #FF3B30 (Red/Coral)
  - Fats: #FFCC00 (Yellow/Amber)
  - Carbs: #34C759 (Vibrant Green) or #007AFF (Blue) — Note: Users can customize, but hardcode these defaults.
  - Calories (Expenditure): #FF9500 (Orange) or #AF52DE (Purple) depending on the chart context.

## 1.2. Typography

MacroFactor uses a custom font (Macro Sans), but for replication, use Inter or DM Sans.
- **Headings (Data Values):** Font-Weight: 700/800.
- **Body Text:** Font-Weight: 400.
- **Labels/Captions:** Font-Weight: 500 (Uppercase, tracked out).

**Type Hierarchy:**
- H1 (Big Data Numbers): 32px - 48px, Bold.
- H2 (Section Headers): 20px, Semi-Bold.
- Body: 16px, Regular.
- Caption: 12px, Medium, Letter-spacing: 0.5px (Used for axis labels, "PROTEIN", "FAT" tags).

## 1.3. Spacing & Radius
- **Grid Base:** 4px / 8px.
- **Card Border Radius:** 16px (Standard iOS rounded rect style).
- **Button Radius:** 50% (Pill shape) or 12px (Rounded Rect).
- **Padding:** Standard container padding is 16px or 20px.

# 2. Component Library

## 2.1. The "Dashboard Widget" Card
- **Container:** Background #161618, Radius 16px.
- **Header:** Text Secondary, Uppercase (e.g., "NUTRITION & TARGETS").
- **Layout:** Flex-row. Left side contains the Graph, Right side contains the Key/Legend.
- **Interaction:** Tapping a card expands it into a detailed view.

## 2.2. The "Trend Line" Chart
- **Smoothing:** High bezier smoothing (approx 0.3 to 0.5 tension). The line should look liquid.
- **Area Fill:** Gradient fade below the line (Opacity 20% to 0%).
- **The "Haze":** MacroFactor visualizes uncertainty. The trend line is solid, but raw scale readings are represented as scattered dots floating around the line, slightly transparent (#FFFFFF at 40% opacity).

## 2.3. The Progress Bar (Macro Bars)
- **Background Track:** #2C2C2E (Dark Grey).
- **Fill:** Solid Data Color (e.g., #FF3B30 for Protein).
- **Target Line:** A thin vertical line (2px width) overlaid on the bar indicating the goal.
- **Hit State:** If Current >= Target, the distinct target line disappears or the bar glows/changes color to indicate strict adherence.

## 2.4. Bottom Navigation
- **Background:** Translucent Blur (Blur 20px, Background #000000 @ 80%).
- **Icons:**
  - Dashboard: (Grid icon)
  - Food Log: (List/Bowl icon)
  - Quick Add: (Large + Button, floating in center, Brand Orange #FF6B00).
  - Strategy: (Target/Bullseye icon).
  - More: (Hamburger menu).

# 3. Key Screen Layouts

## 3.1. Dashboard (The Hub)
- **Top Bar:** "Today" Selector (Date picker carousel).
- **Hero Section (Nutrition):**
  - Top: Large text "2150" (Calories Remaining or Consumed).
  - Below: Three horizontal progress bars (Protein, Fat, Carbs).
  - Labels: "P 120/180", "F 45/60", "C 150/200" placed below the bars.
- **Expenditure Section:**
  - A line graph showing "Expenditure" (TDEE) trend.
  - Y-Axis is distinctively minimal (often just min/max labels).
- **Weight Trend:**
  - Similar liquid graph. Dots for daily scale weight, Solid line for "Trend Weight".

## 3.2. Food Logger (Search)
- **Search Bar:** Top, full width, rounded 12px, Background #2C2C2E. Text "Search for food...".
- **History List:** Condensed rows.
  - Left: Food Name (White).
  - Subtitle: Brand/Detail (Gray).
  - Right: Calorie count (Orange/White) + Macro breakdown (small colored dots: Red/Yellow/Green).
- **Barcode Scanner:** Floating button or Icon in search bar.

## 3.3. Strategy (Check-In)
- **Visual:** "Coached Mode" banner.
- **Check-In Card:**
  - Status: "Check-in Due" (Highlighted Orange).
  - Data: Displays "Rate of Loss" (e.g., "-0.5% / week").
- **Adjustment UI:**
  - When checking in, the app displays a "Proposed Change" slider.
  - Old Macros (Left, Gray) → Arrow → New Macros (Right, Green/Orange).

# 4. Developer Handoff Notes (CSS/Tailwind)

To achieve the "exact" look, the developer should use these Tailwind-equivalent classes:
- **Dark Mode Backgrounds:** bg-neutral-900 or custom HEX #161618.
- **Text Smoothing:** Always apply antialiased (iOS) or subpixel-antialiased to make thin white text crisp against black.
- **Borders:** Virtually non-existent. Use gap and bg-color differences to separate sections rather than border-solid. If a border is needed, border-white/10.
- **Animations:** All transitions (page loads, graph updates) should be ease-out and roughly 300ms. The graph line should "grow" from left to right on load.