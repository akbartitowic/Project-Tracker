# AUTH-01 — Login sukses

**Request:** `POST /api/login` `{"email":"qa-batch01@local.test","password":"QaPassword123!"}`

**Response:** `200`
```json
{"status":"success","access_token":"343|bDlp...","token_type":"Bearer","user":{"id":40,"name":"QA Batch01 Test", ...}}
```

Token diterima dan valid (dipakai sukses di AUTH-08 `GET /me`).
