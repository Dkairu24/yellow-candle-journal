# The Yellow Candle: trade journal

A trade journal for supply and demand traders. Log setups with your bias, POI and trigger tags, see your results in US dollars or R, and find which patterns pay.

## Open the app

- **Vercel:** https://yellow-candle-journal.vercel.app
- **GitHub Pages:** https://dkairu24.github.io/yellow-candle-journal/
- **Source code (GitHub):** https://github.com/Dkairu24/yellow-candle-journal

Both live copies are the same app and update when changes are pushed to GitHub.

## What it does

- Log trades with entry, stop, exit and lot size. Results show in USD or R, with a $ / R switch.
- Overview, calendar, patterns and a trades list, with filters.
- Pre-trade checklist and setup grade.
- Add up to 6 chart screenshots per trade, each with a caption.
- Result cards and recap cards you can save as images.
- Share a single trade as a public link. Nothing is public until you press Share on a trade, and you can switch a link off at any time.
- Works on phone and desktop.

## Your data

Trades are saved in your own browser. Sign in to also keep them in your own account and sync across devices. Use **Backup** to download your trades and screenshots as a file and **Restore** to load them again.

## How it is built

Plain HTML, CSS and JavaScript. No framework and no build step: push to GitHub and both live copies update.

- `index.html`: the page structure and the order the scripts load in.
- `styles.css`: all styling, including the phone layout.
- `js/`: the app, one file per area, loaded in this order: `core` (helpers, dollars or R), `stats`, `log`, `form`, `filters`, `calendar`, `insights`, `screenshots`, `sync`, `motion`, `landing`, `checklist`, `recap`, `import`, `cards`, `storage`, `share`, `public` and `app` (starts everything).
- `supabase_setup.sql` and `supabase_share.sql`: the backend setup.

The scripts share one global scope, so keep the load order in `index.html`. After a change, bump the `?v=` number on the file links so browsers fetch the new version.

## Setup (for the sync and sharing backend)

Run these once in the Supabase SQL Editor:

1. `supabase_setup.sql`: trades table, per-user access rules and the private screenshot storage.
2. `supabase_share.sql`: public trade links and the public screenshot storage.

Not financial advice. CFDs are high risk and most retail accounts lose money.
