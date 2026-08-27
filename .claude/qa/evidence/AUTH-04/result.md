# AUTH-04 — Signup sukses saat allow_public_signup=true

Live `.env` project ini `ALLOW_PUBLIC_SIGNUP=false` — sengaja TIDAK diubah (berisiko mempengaruhi
server yang sedang berjalan). Diuji via `Config::set('app.allow_public_signup', true)` yang cuma
berlaku di proses `tinker` terisolasi ini, tidak menyentuh `.env` atau proses `php artisan serve`.

**1) Middleware `RestrictPublicSignup` lolos saat true:**
```
Middleware passes through when true: YES
```

**2) Controller `AuthController::signup()` sungguhan dipanggil dengan data valid:**
```
Signup controller status: 200
Response: {"status":"success","access_token":"346|KWwL...","user":{"name":"QA AUTH-04 Test", ...}}
User created in DB: YES (id=41)
```

User test langsung dihapus setelah verifikasi (`$created->tokens()->delete(); $created->delete();`).
