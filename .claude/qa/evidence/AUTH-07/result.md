# AUTH-07 — Logout invalidasi token

**Request 1:** `POST /api/logout` dengan token aktif → `200 {"status":"success","message":"Successfully logged out"}`

**Request 2 (verifikasi):** `GET /api/me` dengan token yang SAMA setelah logout → `401 {"message":"Unauthenticated."}`

Token benar-benar tercabut di server (bukan cuma dihapus di localStorage sisi client).
