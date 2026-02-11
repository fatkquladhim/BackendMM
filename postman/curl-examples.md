# Curl Examples (Happy + Negative)

## 1) GET /

```bash
curl -i http://localhost:3000/
```

## 2) POST /api/auth/register

Happy:
```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"qa_user_1700001","password":"password","role":"EXTERNAL"}'
```

Negative (invalid payload):
```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","password":"123","role":"BAD"}'
```

## 3) POST /api/auth/login

Happy:
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

Negative:
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
```

## 4) POST /api/auth/logout

Happy:
```bash
curl -i -X POST http://localhost:3000/api/auth/logout
```

Negative (method):
```bash
curl -i -X GET http://localhost:3000/api/auth/logout
```

## 5) POST /api/users/grant-permission

Happy (admin):
```bash
curl -i -X POST http://localhost:3000/api/users/grant-permission \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId":"<USER_UUID>","permissionKey":"TASK_VERIFIER"}'
```

Negative (no token):
```bash
curl -i -X POST http://localhost:3000/api/users/grant-permission \
  -H "Content-Type: application/json" \
  -d '{"targetUserId":"<USER_UUID>","permissionKey":"TASK_VERIFIER"}'
```

## 6) POST /api/tasks

Happy:
```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Build weekly video summary","frequency":"WEEKLY","deadline":"2026-02-11T08:00:00.000Z","constraints":"Max 5 minutes","solutions":"Use template A","proofLink":"https://example.com/proof"}'
```

Negative (no token):
```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Build weekly video summary","frequency":"WEEKLY","deadline":"2026-02-11T08:00:00.000Z","constraints":"Max 5 minutes","solutions":"Use template A"}'
```

## 7) GET /api/tasks

Happy:
```bash
curl -i "http://localhost:3000/api/tasks?status=COMPLETED" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Negative (invalid token):
```bash
curl -i http://localhost:3000/api/tasks \
  -H "Authorization: Bearer invalid.token"
```

## 8) PATCH /api/tasks/:id/verify

Happy:
```bash
curl -i -X PATCH http://localhost:3000/api/tasks/<TASK_ID>/verify \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"APPROVE"}'
```

Negative (forbidden):
```bash
curl -i -X PATCH http://localhost:3000/api/tasks/<TASK_ID>/verify \
  -H "Authorization: Bearer <EXTERNAL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"APPROVE"}'
```

## 9) POST /api/boarding

Happy (admin):
```bash
curl -i -X POST http://localhost:3000/api/boarding \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"memberId":"<MEMBER_ID>","periodMonth":"2026-03-01","disciplineScore":90,"liabilities":"None","achievements":"Helped event","notes":"Consistent"}'
```

Negative (validation):
```bash
curl -i -X POST http://localhost:3000/api/boarding \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"memberId":"not-uuid","periodMonth":"2026-03-15","disciplineScore":200}'
```

## 10) GET /api/boarding

Happy:
```bash
curl -i "http://localhost:3000/api/boarding?memberId=<MEMBER_ID>&month=2026-03-01" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Negative (no token):
```bash
curl -i http://localhost:3000/api/boarding
```
