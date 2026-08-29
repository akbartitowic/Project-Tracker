# Project Rules

## Git

- **Jangan pernah merge antar branch tanpa perintah eksplisit dari user.** Ini termasuk `git merge`, `git rebase`, atau operasi sejenisnya. Tunggu instruksi seperti "merge ke main" atau "gabungkan branch X ke Y" sebelum melakukan apapun.

## Frontend — State navigasi WAJIB di URL

Setiap **tab, halaman pagination, filter, dan sort** pada daftar/tabel/tampilan harus disimpan di URL query string (`useSearchParams`), **bukan** `useState` lokal. Tujuannya: kondisi tampilan bisa di-refresh, di-bookmark, dan di-share tanpa berubah. Berlaku untuk fitur baru maupun saat menyentuh fitur lama.

Aturan turunan:
- **Default = param dihapus.** Tab pertama, halaman 1, sort default, filter kosong → jangan tulis param-nya (URL tetap bersih).
- **Validasi nilai dari URL** terhadap daftar yang diizinkan; kalau tidak valid, fallback ke default.
- **Ganti tab/filter/sort → reset `page` ke 1** (hapus param page-nya).
- **History:** ganti tab/filter/sort pakai `setSearchParams(...)` biasa (masuk history, bisa di-*back*); klik pagination pakai `setSearchParams(..., { replace: true })` supaya tidak membanjiri tombol back.
- **Beberapa list dalam satu halaman** → prefix param unik per list (mis. `list_tab` vs `review_tab`) supaya tidak bentrok.
- Pola acuan: `ReviewDashboard` di `resources/js/pages/Review.jsx` (`list_tab`/`list_sort`/`list_page`) dan tab list project di `ProjectBoard.jsx` (`?tab=`).
