# AUTH-09 — Update profile tanpa ganti password

**Percobaan pertama** (tanpa header `Accept: application/json`, tanpa field `email` di body) —
dapat `302` redirect ke root, BUKAN JSON. Setelah diselidiki dengan `-v`: ini murni karena
`Accept` header default curl bukan `application/json`, sehingga Laravel `ValidationException`
(field `email` memang wajib diisi di endpoint ini, lihat di bawah) di-handle sbg request "web"
biasa dan `redirect()->back()` — bukan endpoint yang salah kode.

**Percobaan kedua** (dengan `Accept: application/json` + payload lengkap termasuk `email`):

**Request:** `PUT /api/profile` `{"name":"QA Batch01 Test","nickname":"QA1","phone_number":"081200000001","email":"qa-batch01@local.test"}`

**Response:** `200`
```json
{"status":"success","message":"Profile updated successfully","user":{...,"nickname":"QA1","phone_number":"081200000001",...},"force_logout":false}
```

`force_logout: false` (benar, tidak ganti password), field lain (nickname/phone_number) ter-update.

**Temuan (Suggestion Adjustment, severity rendah):**
1. `PUT /profile` mewajibkan field `email` selalu dikirim (422 "The email field is required." kalau
   tidak ada) — bukan partial-update. Tidak masalah untuk frontend asli (`Profile.jsx` selalu kirim
   `email`), tapi API consumer lain bisa kaget.
2. Endpoint API ini (dan kemungkinan endpoint lain) merespons validasi gagal dengan **redirect HTML**
   kalau client tidak kirim `Accept: application/json` — bukan JSON. Tidak berdampak ke frontend asli
   (`fetchAPI` selalu set header itu), tapi untuk API-only backend biasanya lebih aman dipaksa selalu
   JSON di seluruh grup route `/api/*` (mis. via middleware yang set `$request->headers->set('Accept','application/json')`
   di awal, atau custom exception renderer) supaya konsisten terlepas dari header yang dikirim client.
