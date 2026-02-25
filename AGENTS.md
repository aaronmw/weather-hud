# AGENTS.md

## Cursor Cloud specific instructions

Single-service Next.js app — no database, Docker, auth, or env vars needed. See `CLAUDE.md` for commands (`npm run dev`, `npm run build`, `npm run lint`).

- **Dev server** uses `--webpack` flag (not Turbopack); runs on `http://localhost:3000`.
- The API route `/api/weather` fetches live XML from Environment Canada (`dd.weather.gc.ca`). Outbound internet is required for the app to display data.
- No test framework is configured — validation is lint + build + manual browser check.
- Font Awesome icons load from a CDN kit script; they will be missing without internet access.
