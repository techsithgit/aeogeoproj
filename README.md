# AEO/GEO Engine (v1–v4)

## Scheduled quota reset (Vercel Cron)

Use the provided endpoint to reset monthly usage for all users:

- Endpoint: `POST /api/admin/reset-quotas`
- Recommended schedule: monthly on the 1st (Vercel Cron job)

Example `vercel.json` entry:
```json
{
  "crons": [
    { "path": "/api/admin/reset-quotas", "schedule": "0 0 1 * *" }
  ]
}
```
