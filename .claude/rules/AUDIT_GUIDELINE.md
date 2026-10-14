# Audit Guideline — HubTask (Project Tracker)

Panduan audit kode untuk project ini, mengikuti SOP **Vibe Coding Standardization** (Noohtify). Dipakai sebelum rilis/deploy, atau kapan pun diminta audit atas suatu fitur/bagian.

## Cara pakai

Perintah ke Claude:

> Baca file `.claude/rules/AUDIT_GUIDELINE.md`, lalu lakukan audit lengkap dari hasil development pada project ini, cek bagian/fitur **[sebutkan bagian]**. Fokus pada kesesuaian alur, potensi security, kesalahan data, struktur kode yang tidak sesuai standar, dan masalah lain. Beri urutan severitas dari mulai critical sampai small.

**Setelah menerima hasil audit: baca dengan cermat dan hati-hati.** Jangan langsung minta Claude melakukan fixing — kadang hasil audit tidak sesuai konteks fitur yang sebenarnya (false positive). Validasi dulu tiap temuan sebelum masuk antrian perbaikan.

---

## 1. Alur & Kesesuaian Fungsional

- Alur fitur sesuai requirement/permintaan asli — tidak ada langkah yang hilang atau berbeda dari yang diminta.
- Edge case wajar sudah ditangani (list kosong, nilai null/nol, user tanpa akses, data duplikat).
- Pesan error/validasi informatif, bukan generic ("Something went wrong").
- Tidak ada state UI yang bisa "nyangkut" (loading tanpa akhir, modal yang tidak bisa ditutup, dsb).

## 2. Keamanan

- Setiap route API baru dilindungi `auth:sanctum` + `permission:{slug}` (`app/Http/Middleware/CheckPermission`), **kecuali** memang sengaja publik — dan kalau publik, pastikan disengaja + field yang di-expose sudah diminimalkan (pola `GET /branding`, `GET /announcements/active`).
- **IDOR check**: endpoint yang menerima `{id}` di URL (task, project, board, dsb.) memverifikasi kepemilikan/akses lewat helper scoping yang sesuai (`ProjectAccess::assertCanAccessProject`, `WeeklyReportAccess::assertCanAccessBoard`, dll) — bukan cuma permission generik yang dicentang di role.
- Validasi input dilakukan di server (Laravel Validator), tidak mengandalkan validasi frontend saja.
- Mass assignment dibatasi lewat `$fillable` eksplisit, bukan `$guarded = []`.
- Field sensitif (password, token, dsb) ada di `$hidden` model, tidak ikut ke response JSON.
- Upload file divalidasi `mimes` + `max` size di server (pola `Announcement::uploadAttachment`), bukan cuma dicek di frontend.
- Tidak ada secret/credential ter-hardcode di kode (cek `.env`, bukan ditulis literal di controller).

## 3. Integritas Data & Query

- **Kolom tanggal** di-cast `'date:Y-m-d'`, **bukan** `'date'` polos — project ini `APP_TIMEZONE=Asia/Jakarta` sementara Carbon default serialize ke UTC, riwayat bug pergeseran 1 hari sudah pernah terjadi berkali-kali. Kalau response dibangun manual (array biasa, bukan lewat `$model->toArray()`/`toJson()`), cast TIDAK otomatis berlaku — wajib `optional($x->due_date)->format('Y-m-d')` eksplisit.
- Migration baru **menghindari `UPDATE ... JOIN`** (sintaks MySQL) — test suite project ini jalan di **PostgreSQL** (`phpunit.xml`) sementara dev/prod pakai MySQL, jadi portabilitas wajib: pakai `chunkById` + update per-baris, atau single-table update tanpa join.
- FK/unique/index baru pakai nama custom pendek via `App\Support\MigrationNames` (lihat `database/MIGRATION_CONVENTIONS.md`) — nama auto-generate Laravel bisa melebihi limit 64 karakter MySQL dan bikin migration gagal di production.
- Tidak ada N+1 query mencolok pada endpoint list (cek eager-loading relasi yang ditampilkan).
- Operasi atas data yang berpotensi jutaan baris pakai `chunkById`/pagination, bukan `->get()` tanpa batas.
- Kalkulasi angka yang muncul di lebih dari satu tempat (mis. MH quota di Project Board, Finance Monitoring, Client Monitoring) memakai **satu sumber helper yang sama**, bukan re-derive logicnya di tempat lain — supaya tidak ada dua angka yang seharusnya sama tapi beda.

## 4. RBAC

- Modul/menu baru terdaftar di `App\Support\PermissionCatalog::menuActionMap()`, dan migration baru memanggil `PermissionCatalog::sync()`.
- Default grant permission modul baru masuk akal — biasanya Admin-only dulu, role lain di-toggle manual dari Access Control (konsisten dengan pola modul-modul baru sebelumnya).
- Fitur dengan konsep "membership"/"siapa yang jadi anggota" (project, board Weekly Report, dsb) dicek **dua lapis**: permission generik modul **DAN** keanggotaan spesifik objeknya — jangan andalkan permission generik saja.
- Kalau ada dua konsep "role" yang mirip namanya (system role vs project role — pernah jadi bug nyata di notifikasi MH threshold), pastikan logic mengecek yang benar, bukan asumsi salah satu saja.

## 5. Frontend

- Tab, pagination, filter, dan sort pada list/tabel **wajib** tersimpan di URL query string (`useSearchParams`), bukan `useState` lokal — lihat rule di `CLAUDE.md` root. Default → param dihapus; nilai dari URL divalidasi terhadap whitelist; ganti tab/filter/sort → reset `page`.
- Semua teks UI dalam **Bahasa Inggris** (lihat `PROJECT_CONTEXT.md` → App Rules & Logic) — termasuk string yang sumbernya dari data backend (label menu dari tabel `menu_items`, dsb), bukan cuma literal JSX.
- Desain dark mode konsisten dengan token warna existing (background `#000040`, card `#151b28`) — bukan warna hardcode baru yang tidak match.
- Komponen berulang (card, baris tabel, badge status) pakai struktur/padding yang konsisten satu sama lain.
- Tidak ada state yang butuh di-refresh manual untuk sinkron — optimistic update di-revert dengan benar kalau request gagal.

## 6. Must-Have (standar Noohtify — Vibe Coding SOP)

- Fitur yang melibatkan multi-user/akses berbeda per role → ada RBAC-nya (modules/permissions/roles), bukan hardcode email/ID.
- List/tabel dengan data berpotensi banyak → ada pagination.
- Fitur yang berpotensi perlu integrasi ke sistem luar → sudah dipertimbangkan titik integrasinya sejak desain, bukan ditempel belakangan.
- Ada dokumentasi deployment yang ter-update (`DEPLOY-PRODUCTION.md`) kalau ada migration baru, env var baru, atau langkah manual tambahan saat rilis.

## 7. Testing & Verifikasi

- Ada test otomatis (`php artisan test`) untuk logic baru — minimal 1 happy path + 1 edge case penting (403/404/validasi gagal).
- `php artisan test` dan `npx vite build` dijalankan bersih (tanpa error baru) sebelum dinyatakan selesai.
- Kalau terpaksa mengubah test lama supaya lolos, pastikan itu benar-benar menyesuaikan ekspektasi yang berubah — bukan menyembunyikan regresi.
- Perubahan yang belum sempat dites manual di browser **disebutkan eksplisit** sebagai catatan, bukan diklaim "selesai" tanpa syarat.

## Format Output Audit

Urutkan temuan dari **Critical → High → Medium → Low → Info**. Tiap temuan sertakan:
1. **Lokasi** — file & baris (atau komponen/endpoint).
2. **Masalah** — apa yang salah/berisiko.
3. **Dampak** — skenario konkret yang bisa terjadi kalau tidak diperbaiki.
4. **Saran** — perbaikan singkat, bukan rewrite besar kalau tidak perlu.
