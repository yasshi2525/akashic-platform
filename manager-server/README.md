# manager-server

`webapp` の `/api/internal/shutdown` に対して、HMAC 署名付きで shutdown 指示を中継する管理用 HTTP サーバーです。

## 環境変数

- `MANAGER_PORT` (default: `3100`)
- `WEBAPP_SHUTDOWN_URL` (default: `http://127.0.0.1:3000/api/internal/shutdown`)
- `SHUTDOWN_HMAC_SECRET` (required)

## 起動

```bash
npm run -w manager-server build
npm run -w manager-server start
```

## トリガ API

### `POST /shutdown`

request:

```json
{
  "enabled": true,
  "reason": "deploy"
}
```

example:

```bash
curl -X POST http://127.0.0.1:3100/shutdown \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"reason":"deploy"}'
```
