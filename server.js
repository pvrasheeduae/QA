const express = require('express');
const path = require('path');
const { runAllTests } = require('./lib/runner');
const { buildHtmlReport } = require('./lib/report');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Run automated tests against a URL
app.post('/api/test', async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL starting with http:// or https://' });
  }

  try {
    const results = await runAllTests(url);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Test run failed' });
  }
});

// Generate a downloadable HTML report from a previous result set
app.post('/api/report', (req, res) => {
  try {
    const html = buildHtmlReport(req.body);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="test-report.html"');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Report generation failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
