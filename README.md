# Mini Project: User + Order service sau API Gateway (nginx chuẩn, KHÔNG dùng Lua)

Chạy: `docker compose up --build`
- Gateway: http://localhost:8080 | MinIO console: http://localhost:9001 (minioadmin/minioadmin)
- user:3001, order:3002, aggregator:3003 (3001/3002 mở port chỉ để đo latency trực tiếp)

| Yêu cầu | Cách làm |
|---|---|
| Routing | nginx: `/users*` -> user-service, `/orders*` -> order-service |
| Offloading | nginx `auth_request` hỏi `aggregator-service /_auth` (verify JWT HS256, 401/403); `limit_req` 10 r/s/IP -> 429 |
| Aggregation | `/dashboard` -> aggregator-service lấy `X-User-Id` (nginx gắn sau khi xác thực) rồi gộp user + orders |
| Valet Key | `GET /users/:id/avatar-url` -> pre-signed PUT URL, `X-Amz-Expires=300` |
| Latency | `node scripts/bench.js` |

Postman: import `postman/Gateway-Mini-Project.postman_collection.json` (token tự sinh).
