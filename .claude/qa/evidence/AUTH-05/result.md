# AUTH-05 — Signup ditolak saat allow_public_signup=false

**Request:** `POST /api/signup` (live state, `.env` `ALLOW_PUBLIC_SIGNUP=false`)

**Response:** `403`
```json
{"status":"error","message":"Public registration is disabled."}
```

Tidak ada user yang sempat terbuat (middleware `signup.enabled` menolak sebelum request sampai ke controller).
