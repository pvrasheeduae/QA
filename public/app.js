const urlInput = document.getElementById('urlInput');
const runBtn = document.getElementById('runBtn');
const statusLine = document.getElementById('statusLine');
const resultsEl = document.getElementById('results');
const downloadBtn = document.getElementById('downloadBtn');

let lastResults = null;

function normalizeUrl(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function setStatus(text, isError = false) {
  statusLine.textContent = text;
  statusLine.classList.remove('hidden');
  statusLine.classList.toggle('error', isError);
}

runBtn.addEventListener('click', runTest);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runTest(); });

async function runTest() {
  const url = normalizeUrl(urlInput.value);
  if (!url) {
    setStatus('Enter a URL first.', true);
    return;
  }

  runBtn.disabled = true;
  resultsEl.classList.add('hidden');
  setStatus(`Loading ${url} and running checks — this can take 20-40s...`);

  try {
    const res = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Test run failed');

    lastResults = data;
    renderResults(data);
    setStatus(`Done in ${(data.durationMs / 1000).toFixed(1)}s`);
    resultsEl.classList.remove('hidden');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    runBtn.disabled = false;
  }
}

function renderResults(data) {
  const { health, accessibility, performance, visual } = data;

  document.getElementById('summaryCards').innerHTML = `
    ${card('Status code', health.statusCode ?? '—', health.loaded ? 'ok' : 'bad')}
    ${card('Broken links', `${(health.brokenLinks || []).length}`, (health.brokenLinks || []).length ? 'bad' : 'ok')}
    ${card('A11y violations', accessibility.violationCount ?? 0, (accessibility.violationCount ?? 0) ? 'warn' : 'ok')}
    ${card('Full load', performance.loadTime ? `${performance.loadTime}ms` : '—', 'ok')}
  `;

  document.getElementById('healthBody').innerHTML = `
    <table>
      <tr><th>Console errors</th><td>${(health.consoleErrors || []).length}</td></tr>
      <tr><th>Page errors</th><td>${(health.pageErrors || []).length}</td></tr>
      <tr><th>Links checked</th><td>${health.linksChecked ?? 0}</td></tr>
    </table>
    ${(health.brokenLinks || []).length ? `
      <table style="margin-top:14px">
        <thead><tr><th>Broken link</th><th>Status</th></tr></thead>
        <tbody>${health.brokenLinks.map(b => `<tr><td>${escapeHtml(b.link)}</td><td>${b.status}</td></tr>`).join('')}</tbody>
      </table>` : '<p style="color:var(--muted)">No broken links found in the sample checked.</p>'}
  `;

  document.getElementById('a11yBody').innerHTML = (accessibility.violations || []).length
    ? `<table>
        <thead><tr><th>Rule</th><th>Impact</th><th>Help</th><th>Elements</th></tr></thead>
        <tbody>${accessibility.violations.map(v => `
          <tr>
            <td>${v.id}</td>
            <td><span class="tag ${v.impact}">${v.impact || '—'}</span></td>
            <td>${escapeHtml(v.help)}</td>
            <td>${v.nodes}</td>
          </tr>`).join('')}</tbody>
      </table>`
    : '<p style="color:var(--muted)">No accessibility violations detected by axe-core.</p>';

  document.getElementById('perfBody').innerHTML = `
    <table>
      <tr><th>Time to first byte</th><td>${performance.ttfb ?? '—'} ms</td></tr>
      <tr><th>DOM content loaded</th><td>${performance.domContentLoaded ?? '—'} ms</td></tr>
      <tr><th>Full page load</th><td>${performance.loadTime ?? '—'} ms</td></tr>
    </table>
  `;

  document.getElementById('visualBody').innerHTML = visual.map(v => v.screenshot
    ? `<div class="shot-card"><img src="${v.screenshot}" alt="${v.viewport} screenshot" /><div class="cap">${v.viewport} — ${v.width}x${v.height}</div></div>`
    : `<div class="shot-card"><div class="cap">${v.viewport} — failed: ${escapeHtml(v.error || '')}</div></div>`
  ).join('');
}

function card(label, value, cls) {
  return `<div class="summary-card"><div class="label">${label}</div><div class="value ${cls}">${value}</div></div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

downloadBtn.addEventListener('click', async () => {
  if (!lastResults) return;
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lastResults),
  });
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'test-report.html';
  link.click();
});
