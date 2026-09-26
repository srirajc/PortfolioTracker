# Portfolio Tracker - Project Status

## Baseline Overview
A Next.js & PostgreSQL portfolio dashboard designed to track Stocks (ASX), US Stocks, ETFs, and Crypto with live market price syncing and multi-currency (AUD/USD) conversions.

---

## Completed Phases

### Phase 1: Core Dashboard & Live Price Pipeline
- [x] **Database Schema:** `assets` and `transactions` PostgreSQL tables with SQL aggregation.
- [x] **Multi-Asset Support:** Stocks, US_STOCKS, ETFs, and Crypto asset handling.
- [x] **Live Price Fetching Pipeline:**
  - **Crypto:** 3-tier fallback strategy (CoinGecko -> Binance -> CoinCap).
  - **US & ASX Equities:** Stooq CSV API with Yahoo Finance fallback.
- [x] **Calculations & FX:** Cost basis, current market value, FX conversions (AUD/USD), and dynamic unrealised gain/loss ($ / %).

### Phase 2: Asset Detail & Transaction Management
- [x] **Asset Detail Page (`/assets/[id]`):** Dedicated view for inspecting individual asset metrics and full transaction history.
- [x] **Transaction Operations:**
  - Add BUY / SELL transactions.
  - Delete individual transactions with automatic recalculation of overall holdings, average cost, and cost basis.
- [x] **Liquidation Handling:** Fully liquidating (selling all units) reflects zero balance on the portfolio level while preserving history.

---

## Upcoming Roadmap

### Phase 3: Multi-Tenancy & User Authentication
- [ ] **Database Schema Updates:** Add `users` table and `user_id` foreign keys to isolate data per account.
- [ ] **Decoupled Auth Module (`NextAuth.js` / `Auth.js`):**
  - Registration & Credentials login UI (`/login`, `/register`).
  - Edge middleware protection for API routes and dashboard views.
  - Passwords hashed via `bcrypt`.
- [ ] **Multi-Tenant Data Isolation:** Scope all queries (`app/api/portfolio/route.ts` and detail endpoints) by `session.user.id`.
