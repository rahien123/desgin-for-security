const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'mysecret';
const USER_URL = process.env.USER_URL || 'http://user-service:3001';
const ORDER_URL = process.env.ORDER_URL || 'http://order-service:3002';

// nginx gọi endpoint này qua auth_request cho MỌI request cần bảo vệ.
// 2xx = cho đi tiếp (kèm X-User-Id), 401/403 = nginx từ chối luôn.
app.get('/_auth', (req, res) => {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers['authorization'] || '');
  if (!m) return res.status(401).end();
  let payload;
  try { payload = jwt.verify(m[1], JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).end(); }          // sai chữ ký hoặc hết hạn
  if (!payload.sub) return res.status(401).end();
  const sub = String(payload.sub);

  // Chỉ được truy cập dữ liệu của chính mình: /users/:id, /orders/:id
  const path = (req.headers['x-original-uri'] || '').split('?')[0];
  const t = /^\/(?:users|orders)\/([^/]+)/.exec(path);
  if (t && decodeURIComponent(t[1]) !== sub) return res.status(403).end();

  res.set('X-User-Id', sub).status(204).end();
});

// GET /dashboard: gộp thông tin user + orders của chính người dùng trong token
app.get('/dashboard', async (req, res) => {
  const uid = req.headers['x-user-id'];             // do nginx set sau khi xác thực
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const h = { 'X-User-Id': uid };
    const [u, o] = await Promise.all([
      fetch(`${USER_URL}/users/${encodeURIComponent(uid)}`, { headers: h }),
      fetch(`${ORDER_URL}/orders/${encodeURIComponent(uid)}`, { headers: h }),
    ]);
    if (!u.ok || !o.ok) return res.status(502).json({ error: 'upstream failure', user: u.status, orders: o.status });
    res.json({ user: await u.json(), orders: await o.json() });
  } catch (e) {
    res.status(502).json({ error: 'upstream unreachable' });
  }
});

app.listen(PORT, () => console.log(`Aggregator on ${PORT}`));
