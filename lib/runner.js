const { chromium } = require('playwright');
const axeSource = require('axe-core').source;

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

async function runAllTests(url) {
  const browser = await chromium.launch();
  const startedAt = Date.now();

  const results = {
    url,
    timestamp: new Date().toISOString(),
    health: {},
    visual: [],
    accessibility: {},
    performance: {},
  };

  try {
    // ---------- HEALTH CHECK ----------
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let response;
    try {
      response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (e) {
      results.health = {
        loaded: false,
        error: e.message,
      };
      await context.close();
      throw new Error(`Could not load URL: ${e.message}`);
    }

    const status = response ? response.status() : null;

    // Broken link check (same-page anchors, sampled to avoid huge sites)
    const links = await page.$$eval('a[href]', (as) =>
      as.map((a) => a.href).filter((href) => href.startsWith('http'))
    );
    const uniqueLinks = [...new Set(links)].slice(0, 25); // cap to keep runtime reasonable

    const brokenLinks = [];
    for (const link of uniqueLinks) {
      try {
        const r = await context.request.head(link, { timeout: 8000 }).catch(() =>
          context.request.get(link, { timeout: 8000 })
        );
        if (r.status() >= 400) brokenLinks.push({ link, status: r.status() });
      } catch (e) {
        brokenLinks.push({ link, status: 'unreachable' });
      }
    }

    results.health = {
      loaded: true,
      statusCode: status,
      consoleErrors,
      pageErrors,
      linksChecked: uniqueLinks.length,
      brokenLinks,
    };

    // ---------- ACCESSIBILITY ----------
    await page.addScriptTag({ content: axeSource });
    const axeResults = await page.evaluate(async () => await window.axe.run());
    results.accessibility = {
      violationCount: axeResults.violations.length,
      violations: axeResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        nodes: v.nodes.length,
      })),
    };

    // ---------- PERFORMANCE ----------
    const perfMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      return {
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        loadTime: Math.round(nav.loadEventEnd - nav.startTime),
        transferSize: nav.transferSize || null,
      };
    });
    results.performance = perfMetrics || { note: 'Navigation timing unavailable' };

    await context.close();

    // ---------- VISUAL (SCREENSHOTS AT MULTIPLE VIEWPORTS) ----------
    for (const vp of VIEWPORTS) {
      const vContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vPage = await vContext.newPage();
      try {
        await vPage.goto(url, { waitUntil: 'load', timeout: 30000 });
        const screenshotBuffer = await vPage.screenshot({ fullPage: true });
        results.visual.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          screenshot: `data:image/png;base64,${screenshotBuffer.toString('base64')}`,
        });
      } catch (e) {
        results.visual.push({ viewport: vp.name, error: e.message });
      } finally {
        await vContext.close();
      }
    }

    results.durationMs = Date.now() - startedAt;
    return results;
  } finally {
    await browser.close();
  }
}

module.exports = { runAllTests };
