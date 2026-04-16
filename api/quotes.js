export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');
  const url = req.query.market === 'tpex'
    ? 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
    : 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();
    res.status(200).json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
