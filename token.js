// Dùng: node token.js [userId]   (không cần cài thêm package)
const crypto = require('crypto');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const sub = process.argv[2] || '123';
const now = Math.floor(Date.now() / 1000);
const data = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub, name: 'Test User', iat: now, exp: now + 3600 });
console.log(data + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET || 'mysecret').update(data).digest('base64url'));
