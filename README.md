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

Vite and TypeScript, with no framework. The app is plain DOM code split into modules.

- `index.html`: the page structure.
- `src/`: the app, one TypeScript file per area (`core`, `stats`, `log`, `form`, `filters`, `calendar`, `insights`, `screenshots`, `sync`, `motion`, `landing`, `checklist`, `recap`, `import`, `cards`, `storage`, `share`, `public`, `app`), plus `types.ts` (the `Trade` shape), `styles.css` and `main.ts` (the entry point).
- `supabase_setup.sql` and `supabase_share.sql`: the backend setup.
- Supabase and anime.js are loaded from a CDN in `index.html`.

### Run it on your computer

```bash
npm install
npm run dev        # local site with live reload
npm run typecheck  # TypeScript check
npm run build      # production build into dist/
```

### Deploy

Pushing to `main` deploys both copies. Vercel runs `npm run build` (see `vercel.json`) and GitHub Pages builds with the workflow in `.github/workflows/pages.yml`. In the repo settings, Pages must use "GitHub Actions" as its source.

## Setup (for the sync and sharing backend)

Run these once in the Supabase SQL Editor:

1. `supabase_setup.sql`: trades table, per-user access rules and the private screenshot storage.
2. `supabase_share.sql`: public trade links and the public screenshot storage.

Not financial advice. CFDs are high risk and most retail accounts lose money.
