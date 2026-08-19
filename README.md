# Site Check

Automated website testing tool. Enter a URL, and it will:

- **Health check** — page load status, console/JS errors, broken links (sampled)
- **Accessibility** — runs axe-core against the live DOM, lists violations by impact
- **Performance** — time to first byte, DOM content loaded, full page load time
- **Visual** — full-page screenshots at desktop, tablet, and mobile viewports
- **Report** — one-click download of a self-contained HTML report with everything above

## How it works

A Node.js/Express backend uses **Playwright** to drive a real headless Chromium
browser against the URL you enter (this can't be done purely in-browser due to
cross-origin restrictions). Results are streamed back to a small dashboard UI.

## Deploy online (recommended — no local setup)

This project includes a `Dockerfile` so a host can run it with zero manual config.
Steps for **Render** (has a free tier, easiest path):

1. **Push this folder to a GitHub repo.**
   - Go to github.com → New repository → name it e.g. `site-check` → Create.
   - On your machine (or GitHub's web upload): unzip this project, then:
     ```bash
     cd webtest-app
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/site-check.git
     git push -u origin main
     ```
2. **Create the web service on Render.**
   - Go to [render.com](https://render.com) → sign up/log in (free) → **New +** → **Web Service**.
   - Connect your GitHub account and select the `site-check` repo.
   - Render will detect the `Dockerfile` and the `render.yaml` automatically — just confirm the free plan.
   - Click **Create Web Service**.
3. **Wait for the build** (first build takes a few minutes — it's pulling the Playwright browser image).
4. You'll get a live URL like `https://site-check-xxxx.onrender.com` — that's your hosted app.

**Notes on the free tier:** Render's free web services spin down after ~15 min of inactivity and take ~30-60s to wake back up on the next request — fine for personal/demo use. For always-on, upgrade to a paid instance ($7/mo tier) or use Railway/Fly.io instead (same Dockerfile works on both, no code changes needed).

## Run locally instead

```bash
npm install
npx playwright install chromium   # downloads the browser binary (~150MB), only needed once
npm start
```

Then open **http://localhost:3000**, type a URL, and click "Run check."

## Notes & things you may want to extend

- **Broken-link check** is capped at the first 25 unique links per page to keep run time reasonable — raise the cap in `lib/runner.js` (`uniqueLinks`) if needed.
- **Performance** currently uses browser Navigation Timing (TTFB, DOMContentLoaded, load). For deeper metrics (Core Web Vitals, Lighthouse score), you could integrate `lighthouse` as an npm package and add a section to `runner.js`.
- **Accessibility** uses `axe-core`, the same engine behind Chrome DevTools' Lighthouse a11y audit.
- **Auth-gated or JS-heavy sites**: Playwright waits for the `load` event; for SPAs that render after that, you may want to add a `page.waitForSelector(...)` before screenshotting.
- **Deploying**: this needs a real server (not static hosting) because it launches a browser process — services like Render, Railway, Fly.io, or a small VPS work well. Vercel/Netlify serverless functions are not a good fit for long-running headless browser sessions.
- **Rate limiting / abuse**: since this fetches arbitrary URLs on request, add basic rate limiting (e.g. `express-rate-limit`) before exposing it publicly.

## Project structure

```
webtest-app/
├── server.js           # Express routes: /api/test, /api/report
├── lib/
│   ├── runner.js        # Playwright test logic (health/a11y/perf/visual)
│   └── report.js         # HTML report generator
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── package.json
```
