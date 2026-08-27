# Batch 01 — AUTH-01 s/d AUTH-10

**Tanggal eksekusi:** 2026-08-11
**Modul:** AUTH (Login, Signup, Profile, Password Policy)
**Data disposable:** user `qa-batch01@local.test` (id=40, role Freelance) — **masih dipertahankan**
untuk dipakai lagi di Batch 02/03 (masih modul AUTH), akan dibersihkan setelah Batch 03 selesai.

## Ringkasan

| Status | Jumlah |
|---|---|
| Passed | 10 |
| Bug | 0 |
| Need Adjustment | 0 |
| Suggestion Adjustment | 3 (tercatat sbg catatan tambahan, bukan skenario terpisah) |

**Semua 10 skenario Passed.** Tidak ada Bug di batch ini. Ada 3 catatan minor (severity rendah,
tidak mempengaruhi frontend asli) yang saya rekam sbg `Suggestion Adjustment` — bukan penghalang
lanjut ke batch berikutnya:

1. **AUTH-03/AUTH-06** — pesan 429 di `/login` & `/signup` pakai default Laravel bahasa Inggris
   ("Too Many Attempts."), tidak konsisten dgn limiter umum `api` yang sudah dikustomisasi jadi
   pesan Indonesia. Toast rate-limit di frontend tetap muncul (fungsional benar), cuma teksnya beda bahasa.
2. **AUTH-09** — `PUT /profile` mewajibkan field `email` selalu dikirim (bukan partial update);
   tidak masalah untuk frontend asli tapi bisa mengejutkan API consumer lain.
3. **AUTH-09** — endpoint `/api/*` merespons error validasi dengan HTML redirect (302), bukan JSON,
   kalau client tidak mengirim header `Accept: application/json`. Frontend asli selalu mengirim
   header itu (`fetchAPI`) jadi tidak berdampak nyata, tapi API-only backend biasanya lebih aman
   dipaksa selalu JSON di seluruh grup route `/api/*`.

## Detail per skenario

| ID | Status | Ringkasan Hasil | Evidence |
|---|---|---|---|
| AUTH-01 | **Passed** | Login sukses → 200 + token diterbitkan | `evidence/AUTH-01/result.md` |
| AUTH-02 | **Passed** | Password salah → 401 "Invalid login credentials" (pesan generik) | `evidence/AUTH-02/result.md` |
| AUTH-03 | **Passed** | Attempt ke-9+ dalam window yang sama → 429 (limit 10/menit aktif) | `evidence/AUTH-03/result.md` |
| AUTH-04 | **Passed** | Diuji via `Config::set()` terisolasi (tanpa ubah `.env` live) — signup sukses, user+token dibuat, langsung dibersihkan | `evidence/AUTH-04/result.md` |
| AUTH-05 | **Passed** | State live `.env` `ALLOW_PUBLIC_SIGNUP=false` → 403 "Public registration is disabled." | `evidence/AUTH-05/result.md` |
| AUTH-06 | **Passed** | Attempt ke-6 dalam window yang sama → 429 (limit 5/menit aktif, throttle jalan sebelum signup.enabled) | `evidence/AUTH-06/result.md` |
| AUTH-07 | **Passed** | Logout → token langsung tercabut di server, `GET /me` sesudahnya 401 | `evidence/AUTH-07/result.md` |
| AUTH-08 | **Passed** | `GET /me` akurat; `menu_items` unfiltered dikonfirmasi by-design lewat komentar kode | `evidence/AUTH-08/result.md` |
| AUTH-09 | **Passed** | Update profile tanpa ganti password → `force_logout:false`, field ter-update benar (2 catatan minor, lihat di atas) | `evidence/AUTH-09/result.md` |
| AUTH-10 | **Passed** | Ganti password → `force_logout:true`, token lama invalid, password baru langsung bisa login | `evidence/AUTH-10/result.md` |

## Belum bisa dieksekusi di batch ini

Tidak ada — semua 10 skenario batch ini ber-`Exec=API`, semua sudah selesai dieksekusi.
