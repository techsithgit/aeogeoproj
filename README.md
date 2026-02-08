# AEO/GEO Engine (v1–v4)

## Scheduled quota reset (Vercel Cron)

Use the provided endpoint to reset monthly usage for all users:

- Endpoint: `POST /api/admin/reset-quotas`
- Optional shared secret: set `RESET_QUOTA_SECRET` env and call with header `x-reset-secret: <value>`
- Recommended schedule: monthly on the 1st (Vercel Cron job)

Example `vercel.json` entry:
```json
{
  "crons": [
    { "path": "/api/admin/reset-quotas", "schedule": "0 0 1 * *" }
  ]
}
```

## Local testing without Stripe (simulate account types)

If Stripe is not integrated yet, you can still test role/plan gating and limits.

### 1) Simulate plan types (`free`, `pro`, `agency`)

Use local admin test endpoint `POST /api/admin/local-test` (development only).

Set `.env.local`:
```bash
LOCAL_ADMIN_TEST_SECRET=your-local-secret
```

Set user plan:

```bash
curl -X POST http://localhost:3000/api/admin/local-test \
  -H "Content-Type: application/json" \
  -H "x-local-admin-secret: your-local-secret" \
  -d '{"action":"set_user_plan","email":"user@example.com","plan":"free"}'
```

Change `"plan"` to `"pro"` or `"agency"` and re-login as that user.

### 2) Simulate team roles (`owner`, `member`, `viewer`)

- Invite as `member` to test run/share/export allowed.
- Invite as `viewer` to test view-only behavior.
- Accept invite with token:

```bash
curl -X POST http://localhost:3000/api/teams/invite/<INVITE_TOKEN>/accept \
  -H "Cookie: next-auth.session-token=<INVITED_USER_SESSION_COOKIE>"
```

### 3) Simulate monthly quota limits

Run analyses until limit is reached, then reset:

```bash
curl -X POST http://localhost:3000/api/admin/reset-quotas \
  -H "x-reset-secret: <RESET_QUOTA_SECRET>"
```

### 4) Simulate billing states in DB (no Stripe)

Use local admin test endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/local-test \
  -H "Content-Type: application/json" \
  -H "x-local-admin-secret: your-local-secret" \
  -d '{"action":"set_team_billing","team_id":"<TEAM_ID>","plan":"pro","subscription_status":"active","included_seats":3,"purchased_seats":0}'
```

Try variants like `plan='free'` or `subscription_status='past_due'` and reload:
- `/billing`
- `/projects`
- `/projects/<project_id>`

### 5) Reset a single user quota quickly

```bash
curl -X POST http://localhost:3000/api/admin/local-test \
  -H "Content-Type: application/json" \
  -H "x-local-admin-secret: your-local-secret" \
  -d '{"action":"reset_user_quota","email":"user@example.com"}'
```
