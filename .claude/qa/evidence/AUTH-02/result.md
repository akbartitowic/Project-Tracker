# AUTH-02 — Login gagal, password salah

**Request:** `POST /api/login` dengan password salah (`password-salah-sengaja`)

**Response:** `401`
```json
{"message":"Invalid login credentials"}
```

Pesan generik — sama persis dengan pesan untuk email yang sama sekali tidak terdaftar (dicek manual, lihat AUTH-19 di batch mendatang), tidak membocorkan apakah email terdaftar atau tidak.
