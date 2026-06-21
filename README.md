# Ledger — Daily Finance Tracker (PWA)

A complete, installable personal finance app. Log daily income and expenses, tag each one with a **payment method** (UPI, credit card, debit card, cash, net banking, wallet), and see where your money goes on a **graph dashboard**. Works as a normal website **and** as an installable, offline-capable PWA.

No backend or sign-up required — your data is stored privately on your device.

---

## Tech stack (and why)

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite 5** | Fast dev server, zero-config production build, first-class PWA support |
| UI | **React 18** | Component model, huge ecosystem |
| Charts | **Recharts** | Declarative, responsive charts that theme cleanly |
| Offline / installable | **vite-plugin-pwa** (Workbox) | Auto-generated service worker + manifest, offline caching |
| Storage | **localStorage** | No server needed → truly "ready to run + deploy"; data stays on-device |
| Styling | **Hand-written CSS** with light/dark design tokens | Distinctive look, no CSS framework version risk |

Because there is no backend, the app deploys to any static host with zero configuration.

---

## Features

### Money tracking
- **Add / edit / delete transactions** — amount, income vs expense, category, payment method, date, note.
- **Payment-method tracking** — UPI, Credit Card, Debit Card, Cash, Net Banking, Wallet.
- **Graph dashboard** — closing balance with a money-flow bar, income/expense tiles, spending-by-category donut, spending-by-payment-method bars, and a 6-month income-vs-expense chart.

### Month-wise everything
- **Shared month navigator** on both Dashboard and History: an **All time** toggle plus a **‹ / ›** stepper and dropdown to jump into any previous month.
- **History** is scoped to the selected month, with income/expense totals for that period.
- **Export** is scoped too — export all-time *or* a single month (JSON + CSV).

### Month settlement (carry-forward)
- Close out a month with **Settle & carry forward**. The month's **closing balance** (`opening + income − expense`) becomes the **opening balance** of the next month, so balances chain across months.
- If you edit a settled month's transactions, the card shows **Needs update**; one click re-settles. You can also **Undo settlement**.

### Borrowed & lent (kept separate)
- A dedicated **Debts** tab to record money you **lent** (owed to you) or **borrowed** (you owe), with optional due dates.
- **Mark paid / received** to settle an item, or **reopen** it. Overdue items are flagged.
- These are **never counted** in monthly income, expenses, or settlement totals — exactly as requested.

### Reminders (notifications)
- Opt-in browser notifications for a **daily "log your spending"** nudge (at a time you choose, only if nothing was logged that day) and a **pending-settlements** reminder for open borrowed/lent items.
- See the honest limitations under [Reminders & notifications](#reminders--notifications) below.

### General
- **Light & dark themes**, remembered across visits; **multi-currency** (INR ₹ default, USD, EUR, GBP, JPY, AED).
- **Full backup / restore** (transactions + debts + settlements + settings) plus per-scope export.
- **Installable PWA**, works offline; **responsive** with a desktop sidebar and a mobile bottom bar + floating add button.

The app ships with sample data on first run. Clear it anytime in **Settings → Clear all data**.

## Run locally

Requires **Node.js 18+**.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

> The service worker is disabled in dev for a smooth developer experience. To test PWA/offline behavior, use a production build (below).

## Production build

```bash
npm run build      # outputs static files to /dist
npm run preview    # serves the built app locally to test it
```

Everything in `dist/` is static — host it anywhere.

---

## Deploy

**Vercel**
1. Push this folder to a Git repo and import it at vercel.com, or run `npx vercel`.
2. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`. Deploy.

**Netlify**
1. Import the repo, or run `npx netlify deploy --prod`.
2. Build command `npm run build`, publish directory `dist`.

**GitHub Pages**
1. If serving from a subpath (e.g. `https://user.github.io/repo/`), add `base: '/repo/'` to `vite.config.js`.
2. `npm run build`, then publish the `dist/` folder (e.g. with the `gh-pages` package or an Actions workflow).

**Any static host / your own server**
Run `npm run build` and serve the `dist/` folder. Serve over **HTTPS** so the PWA can install and the service worker can register.

---

## Install as an app

Open the deployed site and use your browser's **Install app / Add to Home Screen** option (address-bar icon on desktop Chrome/Edge, Share → Add to Home Screen on iOS Safari).

---

## Reminders & notifications

Enable them in **Settings → Reminders** (you'll be asked for browser permission once).

**What the web can and can't do — honestly:**
- There is **no reliable, cross-browser way to fire a notification at a future time while the tab is fully closed** without a push server. This app has no backend, so it doesn't promise that.
- Reminders are checked **while the app is open or running in the background** (every minute, and whenever you refocus the app). On an **installed PWA**, the browser may keep it alive enough to deliver them around the scheduled time.
- For guaranteed, always-on background delivery you'd add a small **web-push server** (VAPID keys + a `push` handler in the service worker). The current service worker already supports showing notifications; only the scheduled server-push piece would be new.

So: great for a personal nudge when you use the app daily; not a substitute for a bank's SMS alerts.

## Mobile apps (Android & iOS)

This project is wrapped with **Capacitor**, so the same codebase ships as native Android and iOS apps with no rewrite. On device, reminders become real OS-scheduled notifications (fire even when closed) and data is mirrored to native storage for durability.

Quick start:

```bash
npm install
npm run build
npx cap add android      # and/or: npx cap add ios   (iOS needs a Mac)
npm run cap:assets       # generate icons + splash from /assets
npm run android          # build + open Android Studio   (npm run ios on Mac)
```

Full prerequisites, release builds, and store-submission steps are in **[README-MOBILE.md](./README-MOBILE.md)**.

## Project structure

```
finance-tracker/
├── index.html              # entry, fonts, pre-paint theme
├── vite.config.js          # Vite + PWA (manifest, service worker, font caching)
├── package.json
├── public/                 # PWA icons + favicon
└── src/
    ├── main.jsx            # React root
    ├── App.jsx             # nav, routing, modals, reminders, toast
    ├── index.css           # design tokens + all styles (light/dark)
    ├── lib/
    │   ├── constants.js    # categories, payment methods, currencies, palette
    │   ├── storage.js      # localStorage CRUD: transactions, debts, settlements, import/export
    │   ├── format.js       # currency/date formatting
    │   ├── stats.js        # dashboard aggregations
    │   ├── settlements.js  # month carry-forward helpers
    │   ├── notify.js       # notification helpers (web + native)
    │   └── native.js       # Capacitor: scheduled notifications + storage backup
    ├── hooks/
    │   ├── useTransactions.js
    │   ├── useDebts.js      # debts + settlements
    │   ├── useTheme.js      # theme + settings
    │   └── useReminders.js  # fires daily-log / debt reminders
    └── components/
        ├── Dashboard.jsx    # hero, stats, settlement card, charts
        ├── Charts.jsx       # donut, trend, method charts
        ├── MonthNav.jsx     # shared month navigator
        ├── TransactionForm.jsx
        ├── TransactionList.jsx  # month-scoped history
        ├── Debts.jsx        # borrowed & lent ledger
        ├── DebtForm.jsx
        ├── Settings.jsx     # currency, reminders, export/backup
        └── icons.jsx        # inline SVG icons
```

## Customizing

- **Categories / payment methods / currencies:** edit `src/lib/constants.js`.
- **Colors / fonts / spacing:** edit the token blocks at the top of `src/index.css`.
- **App name / icons / theme color:** edit the `manifest` in `vite.config.js` and replace the PNGs in `public/`.

## Notes

- Data lives in `localStorage` per browser/device. Use **Export** to move it between devices or browsers.
- The fonts (Space Grotesk, Inter) load from Google Fonts and are cached by the service worker for offline use after the first online load.
