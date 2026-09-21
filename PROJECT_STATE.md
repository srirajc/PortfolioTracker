# Project State & Developer Log

## 1. Tech Stack & Architecture
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS v3 with dark mode enabled (`darkMode: 'class'`)
* **State & Theme Management:** Native React Context (`context/ThemeContext.tsx`) with `localStorage` persistence and fallback SSR handling
* **Currency:** AUD base currency formatting with dynamic USD FX rate integration

---

## 2. Completed Features
* **Live Portfolio Overview:**
  * Top-level KPI cards displaying Total Portfolio Value (AUD), Cost Basis, and Category Breakdown (Shares, ETFs, Crypto).
  * Overall Unrealised Gain/Loss calculation with color-coded directional indicators.
* **Outperformer & Underperformer Banners:**
  * Dynamic calculation and highlight banners for **Top Performer** and **Lowest Performer** assets based on percentage gain.
* **Holdings Table:**
  * Clean tabbed listing of all active asset holdings.
  * Multi-currency support (USD/AUD) with live FX conversion readouts.
  * Row highlighting for top and lowest performing holdings.
* **Theme System:**
  * Universal Light / Dark mode display toggle (`ThemeToggle.tsx`).
  * Custom high-contrast dark theme background (`slate-950` / `#020617`).
  * Instant local state update with persistent preference saving in `localStorage`.

---

## 3. Key Decisions & Architectural Rules
* **No External Theme Dependencies:** Replaced `next-themes` with a custom native React `ThemeContext` to avoid Next.js App Router hydration mismatches and ESLint v9 peer dependency conflicts.
* **Explicit Dark Mode Strategy:** Standardized Tailwind CSS `darkMode: 'class'` configuration applied directly at `document.documentElement` (`html.dark`).
* **Relative Import Paths:** Preferred relative module resolution (`../components/ThemeToggle`, `../context/ThemeContext`) for components stored directly under root directories.
* **Version Safety:** Created Git restore tag (`restore-point-v1`) before undertaking database expansions or breaking migrations.

---

## 4. Current Open Tasks & Next Steps
- [ ] **Database Expansion:** Transition from mock API responses (`/api/portfolio`) to a production-grade database schema (e.g., Prisma + PostgreSQL or SQLite).
- [ ] **Expanded Asset Support:** Add schema support for Real Estate, Fixed Income, and Cash holdings.
- [ ] **Transaction Ledger:** Implement historical transaction logging (Buy, Sell, Dividend receipts).
- [ ] **Live Price Feeds:** Integrate external market data APIs for automated real-time price updates across stocks and crypto.

---
*Last Updated: September 2026*

## Restoration & Branching Strategy

### 1. Known Working Git Commits
- **`5cc6d1d`** (HEAD): Clean project state including documentation.
- **`2655614`** (origin/main): Stable PostgreSQL implementation (`portfolio_db`).

### 2. Quick Restore Commands
- **Restore single API file:**
  ```bash
  git checkout 2655614 -- app/api/portfolio/route.ts
git reset --hard 5cc6d1d





# Create and switch to feature branch
git checkout main
git pull
git checkout -b feature/<feature-name>

# Commit progress checkpoints
git add .
git commit -m "checkpoint: <brief description>"

# Merge back to main after verifying builds
git checkout main
git merge feature/<feature-name>
