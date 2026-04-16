export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');
  res.setHeader('Cache-Control', 's-maxage=60');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { market } = req.query;

  if (market === 'claude') {
    try {
      const body = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => d += c);
        req.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });
      res.status(r.status).json(await r.json());
    } catch(e) { res.status(500).json({ error: e.message }); }
    return;
  }

  try {
    const url = market === 'tpex'
      ? 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
      : 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('upstream ' + r.status);
    res.status(200).json({ ok: true, data: await r.json() });
  } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
}
