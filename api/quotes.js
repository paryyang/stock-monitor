export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { market } = req.query;

  // Claude AI 代理
  if (market === 'claude') {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // TWSE / TPEx 代理
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
