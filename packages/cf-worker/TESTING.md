# Testing the Cloudflare Worker

## Setup

1. Set the admin secret in Cloudflare Workers:
```bash
npx wrangler secret put CLOUDFLARE_WORKERS_ADMIN_KEY
```

2. Get your worker URL (after deploying):
```bash
npx wrangler deploy
# Output will show your worker URL, e.g., https://your-worker.your-subdomain.workers.dev
```

## Test Commands

Replace:
- `YOUR_WORKER_URL` with your actual worker URL
- `YOUR_ADMIN_KEY` with your CLOUDFLARE_WORKERS_ADMIN_KEY
- `SNAPSHOT_ID` with an actual snapshot ID from KV
- `API_KEY` with an actual API key to store/verify

### 1. Submit API Key

```bash
curl -X POST "https://YOUR_WORKER_URL/api/v1/submit-api-key" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "grdl_test123456789012345678901234567890",
    "projectId": "proj_123",
    "orgId": "org_456"
  }'
```

### 2. Verify API Key (POST)

```bash
curl -X POST "https://YOUR_WORKER_URL/api/v1/verify" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "grdl_test123456789012345678901234567890"
  }'
```

### 3. Get Snapshot

```bash
curl -X GET "https://YOUR_WORKER_URL/api/v1/snapshot?id=SNAPSHOT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

## Expected Responses

### Submit API Key (Success)
```json
{
  "success": true,
  "message": "API key stored"
}
```

### Verify API Key (Valid)
```json
{
  "valid": true,
  "projectId": "proj_123",
  "orgId": "org_456"
}
```

### Verify API Key (Invalid)
```json
{
  "valid": false,
  "error": "API key not found"
}
```

### Unauthorized
```
Unauthorized
```

