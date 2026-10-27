// node scripts/bench.js [N=100]
// So sánh latency: gọi trực tiếp service vs đi qua gateway (JWT + rate limit).
// Gửi tuần tự, cách nhau 150ms (~6.5 req/s) để KHÔNG bị rate limit 10 req/s làm sai số liệu.
const crypto = require('crypto');
const N = +process.argv[2] || 100, GAP = 150;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const d = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: '123', iat: now, exp: now + 3600 });
const token = d + '.' + crypto.createHmac('sha256', 'mysecret').update(d).digest('base64url');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];

async function run(url, headers) {
  for (let i = 0; i < 5; i++) { await fetch(url, { headers }).then(r => r.arrayBuffer()); await sleep(GAP); } // warm-up
  const t = [];
  for (let i = 0; i < N; i++) {
    const s = process.hrtime.bigint();
    const r = await fetch(url, { headers }); await r.arrayBuffer();
    if (r.status !== 200) throw new Error(`${url} -> ${r.status}`);
    t.push(Number(process.hrtime.bigint() - s) / 1e6);
    await sleep(GAP);
  }
  t.sort((a, b) => a - b);
  return { avg: t.reduce((a, b) => a + b) / t.length, p50: pct(t, .5), p95: pct(t, .95), max: t[t.length - 1] };
}
(async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const cases = [
    ['GET /users/123',  'http://localhost:3001/users/123',  'http://localhost:8080/users/123'],
    ['GET /orders/123', 'http://localhost:3002/orders/123', 'http://localhost:8080/orders/123'],
  ];
  const rows = [];
  for (const [name, direct, gw] of cases) {
    const a = await run(direct, {}), b = await run(gw, auth);
    rows.push({ endpoint: name, direct_avg_ms: a.avg.toFixed(2), gateway_avg_ms: b.avg.toFixed(2),
      overhead_ms: (b.avg - a.avg).toFixed(2), direct_p95: a.p95.toFixed(2), gateway_p95: b.p95.toFixed(2) });
  }
  const dash = await run('http://localhost:8080/dashboard', auth);
  rows.push({ endpoint: 'GET /dashboard (gateway only)', gateway_avg_ms: dash.avg.toFixed(2), gateway_p95: dash.p95.toFixed(2) });
  console.table(rows);
})().catch(e => { console.error(e.message); process.exit(1); });
