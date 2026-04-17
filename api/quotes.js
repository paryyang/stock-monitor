// api/quotes.js - Vercel Serverless Function
// 代理 TWSE + TPEx 官方 OpenAPI + Anthropic Claude，解決前端 CORS 限制

export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { market } = req.query;

  // ── Claude AI Proxy ──────────────────────────────────────────
  if (market === 'claude') {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not set on Vercel' });
        return;
      }

      const body = req.body || {};

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: body.model || 'claude-haiku-4-5-20251001',
          max_tokens: body.max_tokens || 1500,
          system: body.system || '',
          messages: body.messages || []
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        res.status(response.status).json({ ok: false, error: errText });
        return;
      }

      const data = await response.json();
      res.status(200).json({ ok: true, ...data });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
    return;
  }

  // ── TWSE / TPEx Stock Quotes ─────────────────────────────────
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
