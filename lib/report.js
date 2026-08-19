function buildHtmlReport(results) {
  const { url, timestamp, health = {}, accessibility = {}, performance = {}, visual = [] } = results;

  const brokenLinksRows = (health.brokenLinks || [])
    .map((b) => `<tr><td>${b.link}</td><td>${b.status}</td></tr>`)
    .join('') || '<tr><td colspan="2">None found</td></tr>';

  const a11yRows = (accessibility.violations || [])
    .map((v) => `<tr><td>${v.id}</td><td>${v.impact || '-'}</td><td>${v.help}</td><td>${v.nodes}</td></tr>`)
    .join('') || '<tr><td colspan="4">No violations found</td></tr>';

  const screenshotBlocks = visual
    .map((v) =>
      v.screenshot
        ? `<div class="shot"><h3>${v.viewport} (${v.width}x${v.height})</h3><img src="${v.screenshot}" /></div>`
        : `<div class="shot"><h3>${v.viewport}</h3><p>Failed: ${v.error}</p></div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Test Report - ${url}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 22px; }
  h2 { margin-top: 40px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; }
  .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 18px; min-width: 140px; }
  .card .num { font-size: 24px; font-weight: bold; }
  .shot { margin-top: 20px; }
  .shot img { max-width: 100%; border: 1px solid #ddd; border-radius: 6px; }
  .ok { color: #0a7a2f; }
  .bad { color: #c0392b; }
</style>
</head>
<body>
  <h1>Automated Test Report</h1>
  <p><strong>URL:</strong> ${url}<br/><strong>Run at:</strong> ${timestamp}</p>

  <h2>Health Check</h2>
  <div class="summary">
    <div class="card"><div>Status</div><div class="num ${health.loaded ? 'ok' : 'bad'}">${health.statusCode ?? 'N/A'}</div></div>
    <div class="card"><div>Console errors</div><div class="num">${(health.consoleErrors || []).length}</div></div>
    <div class="card"><div>Page errors</div><div class="num">${(health.pageErrors || []).length}</div></div>
    <div class="card"><div>Broken links</div><div class="num">${(health.brokenLinks || []).length} / ${health.linksChecked ?? 0}</div></div>
  </div>
  <table><thead><tr><th>Link</th><th>Status</th></tr></thead><tbody>${brokenLinksRows}</tbody></table>

  <h2>Accessibility (axe-core)</h2>
  <p>${accessibility.violationCount ?? 0} violation type(s) found.</p>
  <table><thead><tr><th>Rule</th><th>Impact</th><th>Description</th><th>Elements affected</th></tr></thead><tbody>${a11yRows}</tbody></table>

  <h2>Performance</h2>
  <div class="summary">
    <div class="card"><div>TTFB</div><div class="num">${performance.ttfb ?? '-'} ms</div></div>
    <div class="card"><div>DOM Content Loaded</div><div class="num">${performance.domContentLoaded ?? '-'} ms</div></div>
    <div class="card"><div>Full Load</div><div class="num">${performance.loadTime ?? '-'} ms</div></div>
  </div>

  <h2>Visual Screenshots</h2>
  ${screenshotBlocks}
</body>
</html>`;
}

module.exports = { buildHtmlReport };
