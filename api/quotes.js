module.exports = async (req, res) => {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) return res.status(200).end();

try {
const market = req.query && req.query.market;

```
if (market === 'claude') {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'no key' });
  const body = req.body || {};
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system: body.system || '', messages: body.messages || [] })
  });
  const d = await r.json();
  return res.status(r.status).json(d);
}

const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
  headers: { 'Accept': 'application/json' }
});
if (!r.ok) return res.status(500).json({ ok: false, error: 'upstream ' + r.status });
const d = await r.json();
return res.status(200).json({ ok: true, data: d, ts: new Date().toISOString() });
```

} catch (e) {
return res.status(500).json({ ok: false, error: e.message, stack: e.stack });
}
};
