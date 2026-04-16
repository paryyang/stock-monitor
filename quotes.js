// api/quotes.js - Vercel Serverless Function
// 代理 TWSE + TPEx 官方 OpenAPI，解決前端 CORS 限制

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { market } = req.query;

  try {
    const url = market === 'tpex'
      ? 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
      : 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';

    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error('upstream ' + response.status);

    const data = await response.json();
    res.status(200).json({ ok: true, data, source: market || 'twse', ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
