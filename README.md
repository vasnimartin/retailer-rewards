# Retailer Rewards (Vanilla JS)

I built a small Vanilla JavaScript app that calculates and displays retailer reward points.  
By default you see a **Last 3 months** summary for the selected customer; if you pick a specific month, you’ll see all transactions for that month with points per transaction.

---

## Why I implemented it this way

- **Simple, framework-free:** Everything is ES modules and plain DOM. Logic is in small, testable files; UI is a thin render layer.
- **Realistic “last 3 months”:** I anchor the 3-month window to the **newest transaction for that customer** (so historical customers still demo correctly). Year is disabled in this mode to avoid confusion.
- **Clear separation:**  
  - `lib/` → pure logic (points, date grouping, logger)  
  - `ui/` → rendering & controls  
  - `store/state.js` → tiny state container  
  - `constants.js` → all constants in one place
- **UX details:** “No transactions” message for empty months, loading and error states for the mock API, and basic pagination for the customer list.

---

## Features (quick list)

- Vanilla JS (no TS/React/Angular)
- Local JSON dataset with **16 customers, 200+ transactions**
- Simulated async API with delay + failure rate
- Logging to console and `localStorage` (`rr_logs`)
- Customer pagination
- Filters: **Year (2021–2025)** and **Month (Jan–Dec)**, plus **Last 3 months** default
- Per-month totals + overall total; per-transaction points in month view
- **9 Jest tests** (positive & negative, whole + fractional values, empty month, last-3 anchoring)
- JSDoc on core logic

---

## How to run it

```bash
# Install deps
npm install

# Generate mock dataset (writes to public/data/transactions.json)
npm run gen:data

# Run tests
npm test

# Start local server (http://localhost:5173)
npm run dev
