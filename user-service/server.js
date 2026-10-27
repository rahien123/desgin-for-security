const express = require('express');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

const ENDPOINT = process.env.MINIO_ENDPOINT || 'http://minio:9000';
const PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000';
const ACCESS = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const SECRET = process.env.MINIO_SECRET_KEY || 'minioadmin';
const BUCKET = 'avatars';
const EXPIRES = 300; // 5 phút

const mk = (endpoint) => new AWS.S3({
  endpoint, accessKeyId: ACCESS, secretAccessKey: SECRET,
  s3ForcePathStyle: true, signatureVersion: 'v4', region: 'us-east-1',
});
const s3 = mk(ENDPOINT);          // thao tác nội bộ (tạo bucket)
const s3Public = mk(PUBLIC_ENDPOINT); // chỉ để ký URL cho client bên ngoài

// Tạo bucket khi khởi động (retry vì MinIO có thể chưa sẵn sàng)
async function ensureBucket(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      await s3.createBucket({ Bucket: BUCKET }).promise();
      console.log('Bucket created:', BUCKET); return;
    } catch (e) {
      if (['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(e.code)) return;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  console.error('Could not ensure bucket');
}
ensureBucket();

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Mock User', email: 'user@example.com' });
});

// Valet Key: trả pre-signed PUT URL, hết hạn sau 5 phút
app.get('/users/:id/avatar-url', (req, res) => {
  const key = `${req.params.id}/avatar.jpg`;
  s3Public.getSignedUrl('putObject', { Bucket: BUCKET, Key: key, Expires: EXPIRES }, (err, url) => {
    if (err) return res.status(500).json({ error: 'Could not generate URL' });
    res.json({ url, key, method: 'PUT', expiresIn: EXPIRES });
  });
});

app.listen(PORT, () => console.log(`User service on ${PORT}`));
