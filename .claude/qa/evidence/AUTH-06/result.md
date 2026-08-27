# AUTH-06 — Rate limit signup (5/menit)

**Request:** 6x `POST /api/signup` beruntun.

**Hasil per attempt:**
```
attempt 1-5 -> HTTP 403 "Public registration is disabled."
attempt 6   -> HTTP 429
```

Limit `throttle:5,1` (routes/api.php:51) terbukti aktif — throttle middleware jalan LEBIH DULU
dari `signup.enabled`, jadi tetap kena limit walau signup sendiri sedang nonaktif. Tidak ada user
yang terbuat sama sekali selama test ini (aman, tidak perlu cleanup).

Catatan pesan 429 bahasa Inggris — sama seperti AUTH-03 (lihat `evidence/AUTH-03/result.md`).
