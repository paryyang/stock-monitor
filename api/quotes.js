// api/quotes.js - Vercel Serverless Function (CommonJS style)

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) { res.status(200).end(); return; }

const { market } = req.query;

// ── Claude AI Proxy ──────────────────────────────────────────
if (market === ‘claude’) {
try {
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { res.status(500).json({ ok: false, error: ‘ANTHROPIC_API_KEY not set’ }); return; }
const body = req.body || {};
const r = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-api-key’: apiKey, ‘anthropic-version’: ‘2023-06-01’ },
body: JSON.stringify({ model: body.model || ‘claude-haiku-4-5-20251001’, max_tokens: body.max_tokens || 1500, system: body.system || ‘’, messages: body.messages || [] })
});
if (!r.ok) { const t = await r.text(); res.status(r.status).json({ ok: false, error: t }); return; }
res.status(200).json({ ok: true, …(await r.json()) });
} catch (e) { res.status(500).json({ ok: false, error: e.message }); }
return;
}

// ── 盤中即時 + fallback 盤後 ─────────────────────────────────
if (market === ‘realtime’) {
// 先試盤中 mis.twse
try {
const codes = ‘tse_3131.tw|tse_6515.tw|tse_6187.tw|tse_00631L.tw’;
const r = await fetch(
‘https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=’ + codes + ‘&json=1&delay=0’,
{ headers: { ‘Accept’: ‘application/json’, ‘Referer’: ‘https://mis.twse.com.tw/’ } }
);
if (r.ok) {
const data = await r.json();
if (data.msgArray && data.msgArray.length > 0) {
res.setHeader(‘Cache-Control’, ‘s-maxage=15’);
res.status(200).json({ ok: true, source: ‘realtime’, msgArray: data.msgArray });
return;
}
}
} catch (e) { /* fall through */ }

```
// fallback: 盤後 TWSE OpenAPI
try {
  const r2 = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    { headers: { 'Accept': 'application/json' } });
  if (!r2.ok) throw new Error('twse ' + r2.status);
  const data2 = await r2.json();
  res.setHeader('Cache-Control', 's-maxage=60');
  res.status(200).json({ ok: true, source: 'eod', data: data2 });
} catch (e2) {
  res.status(200).json({ ok: false, source: 'none', msgArray: [], data: [], error: e2.message });
}
return;
```

}

// ── 盤後收盤價 TWSE ──────────────────────────────────────────
try {
res.setHeader(‘Cache-Control’, ‘s-maxage=60, stale-while-revalidate=300’);
const r = await fetch(‘https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL’,
{ headers: { ‘Accept’: ‘application/json’ } });
if (!r.ok) throw new Error(’upstream ’ + r.status);
const data = await r.json();
res.status(200).json({ ok: true, data, source: ‘twse’, ts: new Date().toISOString() });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
};




