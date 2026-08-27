# AUTH-03 — Rate limit login (10/menit)

**Request:** 12x `POST /api/login` beruntun dalam window yang sama (termasuk 3 login sukses sebelumnya di window itu).

**Hasil per attempt:**
```
attempt 1-8 -> HTTP 401 "Invalid login credentials"
attempt 9-12 -> HTTP 429 "Too Many Attempts."
```

Limit `throttle:10,1` (routes/api.php:50) terbukti aktif — begitu total request di window yang sama mencapai 10, request berikutnya konsisten 429.

**Catatan (Suggestion Adjustment):** pesan 429 di endpoint ini pakai default Laravel bahasa Inggris
("Too Many Attempts.") — beda dengan limiter umum `api` (300/menit) yang sudah dikustomisasi jadi
pesan Indonesia + `retry_after` eksplisit di body (`AppServiceProvider`). Functionally tetap benar
(toast rate-limit di frontend tetap muncul karena `fetchAPI` men-trigger `notifyRateLimited()` untuk
SEMUA endpoint termasuk `/login`, dan `Retry-After` header tetap ada untuk countdown), tapi pesannya
tidak konsisten bahasa & tidak sehangat limiter umum. Bukan bug — cuma polish opsional.
