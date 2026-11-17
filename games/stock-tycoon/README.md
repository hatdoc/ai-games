# Stock Tycoon: development notes

A stock trading sim on a fictional exchange (the Meridian Exchange, MRX). Plain JavaScript, no build step.

## Files

| File | What it holds |
|---|---|
| `companies.js` | The 24 industries and 108 companies (84 listed at the start, 24 that list later). |
| `events.js` | World, industry and company events, how hard they hit, and the news wording. |
| `engine.js` | The market. `Market.build(day)` returns every price, news story, dividend and economic figure up to that day. |
| `account.js` | The player: cash, calendar, salary, trading, orders, margin, dividends, levels, lifestyle, weekly challenge, save. |
| `chart.js` | Line and candlestick charts on a canvas. |
| `index.html` | All screens. Holds no rules of its own: it calls `Market` and `Account`. |

Shared with other games: `../cloudsave.js` (signed-in saves and `rgAuth`), `../share.js`.

## How the market works

- **One clock for everyone.** The market never closes and runs on real time. A market day is a UTC day; every piece of news
  lands at a real moment (03:12 UTC, say) and moves the price at that moment for every player, wherever they are.
- **The player's own timezone** only decides how times are shown, their Day count, and when their payday arrives: every
  14 days at their local midnight. The user chose this so US players are not disadvantaged; do not switch to one fixed
  daily update hour.
- Nothing about the market is stored. `Market.build(day)` replays every day from 1 Nov 2021 using random numbers addressed by
  (day, company, purpose), so every device gets the same prices and news for the same moment, and charts are real history.
- A day's closing move for a stock = the whole market (by economic phase) x its beta + its industry + its own noise, which
  fades back toward fundamentals + a quarterly earnings surprise + any event that day.
- **During the day** the price travels from yesterday's close to today's along a random path (`bridge` in engine.js), plus a
  jump at the exact moment of each story: company events, rumours, denials, earnings (each company at its own time of
  day), world events, inflation (13:30 UTC), interest rates (18:00 UTC) and dividends (00:05 UTC). `priceAt(c, t)` gives
  the price at any millisecond; `feed(t)` is the news that is out by then.
- **The account** (`tick`) catches up moment by moment: closes are recorded at UTC midnight, dividends, interest and borrow
  fees at 00:05 UTC, limit orders are checked every 5 minutes and margin every hour, whether or not the player is online.
- The screens re-check the time every 15 seconds. A save is only written when something besides the clock changed.
- Events are pure functions of (company, day). That is what lets a rumour appear a few days before the event it leaks.
- A company whose financial health reaches zero goes bankrupt; a reserve company lists one to three months later.

## The rule that matters after launch

**Changing any number or formula in `engine.js`, `events.js` or `companies.js` rewrites the price history for every player.**
Holdings stay, but their prices, past and present, change. New companies go in a new list at the very end of
`companies.js` (after `RESERVE2`), which leaves every existing company's history untouched. Treat
everything else in those three files as frozen. Tuning has to be finished before the game is published.

`account.js` is safe to change. Bump `VERSION` and add a migration line in `decode` when the save shape changes.

## Money and trust

- All money is whole cents. Prices used for trades are always looked up by `account.js` from the market for the account's own day.
- The save lives in `localStorage` (mirrored to the cloud for signed-in players, newest save wins whole). It has a version and a
  checksum, and the previous good save is kept as a backup. The checksum catches corruption, not cheating.
- Everything runs in the browser, so a determined player can edit their save or compute tomorrow's prices. Rankings are
  client-trusted, like the other games on the site. Fixing that needs a server-held daily seed and a trade-replay check.

## Checks

```bash
node scripts/check-stock-tycoon.mjs   # rules and simulation, in Node (about 120 checks, a few seconds)
node scripts/e2e-stock-tycoon.mjs     # the real page in a browser at phone, tablet and desktop sizes (needs playwright)
```

Run both before changing anything. `check-stock-tycoon.mjs` includes bots that try to exploit dividends, limit orders,
borrowing and the analyst view, and bounds on how the market behaves over 15 simulated years.

## Tuning knobs (before launch only, except the first two)

- `account.js`: `START_CASH`, `SALARY`, `PAY_EVERY`, margin limits (`INIT`, `MAINT`), loan and short costs, `LEVELS`, `ITEMS`.
- `engine.js`: `MU` and `SIG` (market drift and nervousness by phase), `KAPPA` (how fast prices return to fundamentals), `SEED`.
- `events.js`: each event's frequency (`w`, `p`) and size (`lo`, `hi`, `m`, `sec`).

## Server side

Rankings, friend comparison and weekly challenge standings are Firestore docs under `stockTycoon/{board}/scores/{uid}`.
The rule is in the blog repo, `firebase/firestore.rules`.
