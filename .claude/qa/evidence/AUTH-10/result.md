# AUTH-10 — Update profile ganti password valid

**Request:** `PUT /api/profile` dengan `password`/`password_confirmation` baru (`QaPasswordBaru456!`)

**Response:** `200`, `"force_logout":true`

**Verifikasi token lama:** `GET /api/me` dengan token yang dipakai untuk request update di atas → `401` (token langsung invalid).

**Verifikasi password baru:** `POST /api/login` dengan password baru → `200`, token baru diterbitkan (`345|XEaE...`).

Semua sesuai ekspektasi: ganti password langsung mencabut token yang sedang dipakai request itu sendiri, dan password baru langsung bisa dipakai login.
