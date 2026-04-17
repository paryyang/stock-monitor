export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
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
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-api-key’: apiKey, ‘anthropic-version’: ‘2023-06-01’ },
body: JSON.stringify({
model: body.model || ‘claude-haiku-4-5-20251001’,
max_tokens: body.max_tokens || 1500,
system: body.system || ‘’,
messages: body.messages || []
})
});
if (!response.ok) { const t = await response.text(); res.status(response.status).json({ ok: false, error: t }); return; }
const data = await response.json();
res.status(200).json({ ok: true, …data });
} catch (e) { res.status(500).json({ ok: false, error: e.message }); }
return;
}

// ── 盤中即時報價 (mis.twse.com.tw) ───────────────────────────
if (market === ‘realtime’) {
try {
// 查詢我們需要的4檔股票
const codes = ‘tse_3131.tw|tse_6515.tw|tse_6187.tw|tse_00631L.tw’;
const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${codes}&json=1&delay=0`;
const response = await fetch(url, { headers: { ‘Accept’: ‘application/json’ } });
if (!response.ok) throw new Error(’upstream ’ + response.status);
const data = await response.json();
res.setHeader(‘Cache-Control’, ‘s-maxage=15, stale-while-revalidate=30’);
res.status(200).json({ ok: true, …data });
} catch (e) {
res.status(200).json({ ok: false, msgArray: [], error: e.message });
}
return;
}

// ── 盤後收盤價 TWSE / TPEx ────────────────────────────────────
try {
res.setHeader(‘Cache-Control’, ‘s-maxage=60, stale-while-revalidate=300’);
const url = market === ‘tpex’
? ‘https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes’
: ‘https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL’;
const response = await fetch(url, { headers: { ‘Accept’: ‘application/json’ } });
if (!response.ok) throw new Error(’upstream ’ + response.status);
const data = await response.json();
res.status(200).json({ ok: true, data, source: market || ‘twse’, ts: new Date().toISOString() });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
}
