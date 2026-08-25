# Plan: Migrasi Bahasa UI — Indonesia → Inggris

**Status:** Phase 4 selesai (2026-08-25)
**Dibuat:** 2026-08-24
**Scope:** Semua teks UI (frontend React) + teks user-facing di backend (error message, email, PDF)

## Keputusan yang sudah diambil di Phase 1 (dipakai sebagai default untuk phase berikutnya, kecuali user bilang lain)

- **Rule governing:** `.claude/rules/PROJECT_CONTEXT.md` baris "App Rules & Logic" sudah bilang "Gunakan Bahasa Inggris untuk semua teks di UI." — sudah diubah oleh user sendiri sebelum Phase 1 dieksekusi. `CLAUDE.md` sendiri ternyata tidak pernah memuat rule bahasa (isinya cuma aturan Git) — jadi tidak perlu diubah.
- **Format tanggal:** dipakai `en-US` untuk semua `toLocaleDateString`/`toLocaleString` yang disentuh Phase 1 (mis. `notificationDisplay.jsx`). Lanjutkan pakai `en-US` di phase berikutnya kecuali ada alasan spesifik pakai `en-GB`.
- **Section sidebar "Bisnis" → "Business":** ternyata bukan cuma teks JSX, tapi DATA di tabel `menu_items` (diseed dari migration `2026_07_04_110000_create_menu_items_table.php`, bisa diedit lewat CRUD Modules admin). Sudah diperbaiki di 3 tempat: (1) migration seed asli untuk fresh install, (2) migration data-fix baru `2026_08_25_090000_rename_bisnis_menu_section_to_business.php` untuk DB yang sudah pernah migrate, (3) konstanta `SECTION_ORDER` di `Sidebar.jsx`. **Pelajaran untuk phase lain:** kalau nemu string Indonesia yang kelihatannya "hardcoded" tapi datang dari `user.menu_items`/props API, cek dulu apakah itu benar dari DB seed (migration) sebelum cuma ubah di frontend — kalau cuma diubah di frontend, filter/pencocokan by string bisa diam-diam rusak.

## Keputusan mendasar yang perlu dikonfirmasi sebelum Phase 1 jalan

1. **Aturan governing harus diubah dulu.** `CLAUDE.md` dan `.claude/rules/PROJECT_CONTEXT.md` saat ini mewajibkan Bahasa Indonesia ("Gunakan bahasa Indonesia untuk semua teks di UI"). Selama rule ini belum diubah, sesi Claude Code manapun (termasuk sesi paralel) akan menganggap Indonesia sebagai standar dan bisa mengembalikan (revert) hasil translasi Inggris — persis seperti insiden yang terjadi 2026-08-24 di file `Review.jsx`. **Update rule ini adalah task pertama Phase 1, bukan opsional.**
2. **Format tanggal.** `toLocaleDateString('id-ID', ...)` dipakai luas untuk menampilkan tanggal. Pindah ke Inggris berarti ganti locale (rekomendasi: `en-US` — bisa juga `en-GB` kalau mau format DD/MM). Perlu dikonfirmasi sebelum Phase 1 supaya konsisten di semua phase berikutnya, bukan tebak-tebakan per sesi.
3. **Format mata uang tetap Rupiah.** Rekomendasi: currency formatting (`Rp X.XXX.XXX`) **tidak ikut diubah** — itu fakta bisnis (project ini transaksi Rupiah), bukan bahasa UI. Yang diubah cuma label/teks di sekitarnya ("Total Biaya" → "Total Cost", dst). Konfirmasi kalau ini asumsi yang salah.
4. **Data value dari backend biarkan apa adanya.** Field seperti `project.status` ("Planning"/"In Progress"/"Done"), `task.status` ("To Do"/"In Progress"/"Done"/"Reopen"), `priority` ("Low"/"Medium"/"High"), `methodology` ("Agile Scrum"/"Waterfall") **sudah dalam Bahasa Inggris** di level data — tidak perlu diubah. Yang perlu dicek per halaman adalah label/badge/mapping DI SEKITAR value itu (pola yang sama seperti `LEVELS`/`REVIEW_STATUS_STYLE` di `Review.jsx` — array/object berisi `label:` yang sering ditulis ulang manual dalam Bahasa Indonesia).

## Cara kerja per phase (checklist standar)

Setiap phase, sebelum ditutup:
- [ ] Semua string JSX (teks, `placeholder`, `title`, `alt`, pesan `alert()`/`throw new Error()`, label validasi) diterjemahkan.
- [ ] `toLocaleDateString('id-ID', ...)` → locale Inggris yang disepakati.
- [ ] Sapuan grep untuk kata Indonesia yang lolos (lihat command di bawah) — target: nol hasil relevan di file yang disentuh phase ini.
- [ ] `npx vite build` sukses tanpa error baru.
- [ ] Kalau ada endpoint/behavior backend yang ikut disentuh, `php artisan test` tetap hijau.
- [ ] Update baris di tabel "Progress" pada file plan ini jadi ✅, plus catatan singkat kalau ada keputusan istilah baru (masuk ke Glossary di bawah).

**Command sapuan grep** (jalankan per file/folder yang baru selesai, sesuaikan daftar kata sesuai temuan):
```bash
grep -noE "\b(yang|dengan|tidak|belum|sudah|akan|silakan|klik|hapus|simpan|batal|tambah|ubah|kembali|dari|kosong|semua|wajib|opsional|per halaman|menampilkan|memuat|gagal|berhasil)\b" <file-atau-folder>
```

## Glossary istilah (isi/tambah selama proses jalan)

Supaya 10 sesi berbeda tidak menerjemahkan istilah yang sama dengan cara berbeda-beda. Isi tabel ini begitu istilah pertama kali ditemukan/diputuskan — phase berikutnya wajib pakai istilah yang sudah ada di sini, bukan menerjemahkan ulang dari nol.

| Istilah Indonesia | Istilah Inggris | Catatan |
|---|---|---|
| Project | Project | tetap (sudah jadi loanword umum) |
| Manhour / MH | Manhour / MH | tetap |
| Bobot | Weight | |
| Trigger | Trigger | tetap |
| Kuota | Quota | |
| Realisasi | Realization | |
| Klien / Client | Client | |
| Simpan | Save | |
| Batal | Cancel | |
| Hapus | Delete | |
| Tambah | Add | |
| Gagal | Failed | |
| Berhasil | Success / Successfully | |
| Memuat… | Loading… | |
| Tidak ada data | No data | |
| Per halaman | Per page | |
| Menampilkan X–Y dari Z | Showing X–Y of Z | |
| Notifikasi | Notifications | |
| Tandai semua dibaca | Mark all as read | |
| Tidak ada notifikasi | No notifications | |
| Detail | Details | |
| Halaman X / Y | Page X / Y | |
| Tutup | Close | |
| Terlalu banyak permintaan | Too many requests | (rate-limit toast) |
| Coba lagi dalam X detik | Try again in Xs | |
| Sisa / Terpakai (kuota MH) | Remaining / Used | ManhourBucketBreakdown |
| Password Saat Ini / Password Baru | Current Password / New Password | |
| Kedaluwarsa (password) | Expired | |
| Menyimpan... | Saving... | |
| Ganti Password | Change Password | |
| Bisnis (nama section sidebar) | Business | data di tabel `menu_items`, bukan cuma teks JSX — lihat catatan Phase 1 di atas |
| Aktif | Active | |
| Sisa | Remaining | |
| hari (durasi) | days | |
| Total task terbanyak / Re-open tertinggi | Most tasks / Highest re-open | (sort option label) |
| Terbaru / Terlama | Newest / Oldest | (sort option label) |
| Terpakai / Sisa | Used / Remaining | (quota widget) |
| Kuota | Quota | |
| Dibuat / Diperbarui (label tanggal task) | Created / Updated | |
| Konfirmasi (dialog description sr-only) | Confirm | |
| Statistik | Statistics | |
| Kembalikan ke Backlog | Move Back to Backlog | |
| Aktif / Done / Favorit (tab list project) | Active / Done / Favorite | (juga dipakai di ProjectBoard.jsx, bukan cuma Review.jsx) |
| Riwayat Perubahan | Change History | task history panel — label field-nya digenerate backend (`TaskChangeLogger.php`), sudah ikut diterjemahkan |
| mengubah/mengatur/menghapus X dari...menjadi... | changed/set/removed X from...to... | task history sentence template |
| Pindah ke Board | Move to Board | backlog |
| Sebagai Task baru / Sebagai Subtask | As a new Task / As a Subtask | backlog promote dialog |
| Bagi Rata | Split Evenly | MH split per assignee |
| Aktif / Non-aktif (assignee toggle) | Active / Inactive | |
| (Anda) | (You) | task notes, penanda note milik sendiri |
| *(lanjutkan diisi tiap phase)* | | |

---

## Phase 1 — Fondasi: rules, glossary, shared chrome & components

**Kenapa duluan:** semua page lain "hidup" di dalam shell ini (sidebar, header, layout, dialog primitives) dan bergantung pada rule + glossary di atas. Kalau phase ini belum kelar, phase 2–10 tidak punya standar yang konsisten untuk diikuti.

Scope:
- `CLAUDE.md`, `.claude/rules/PROJECT_CONTEXT.md` — ganti arahan bahasa UI ke Inggris
- `resources/js/components/layout/{Header,Layout,Sidebar}.jsx`
- `resources/js/components/{LoginNotificationsModal,ErrorBoundary,ManhourBucketBreakdown,AppLogo,RateLimitToast}.jsx` (dipakai lintas banyak page — sekali kelar di sini, tidak perlu diulang di phase-phase yang memakainya)
- `resources/js/components/ui/*.jsx` (15 file — cek teks default hardcoded, mis. `PaginationControls.jsx`)
- `resources/js/pages/Auth/{Login,Signup,ForceChangePassword}.jsx`
- `resources/js/services/api.js` (pesan error yang ditampilkan ke user, mis. rate-limit toast)

Perkiraan: ~2.200 baris kode disentuh (bukan semua baris teks, tapi ini file yang perlu dibaca/dicek).

---

## Phase 2 — Dashboard, Profile, Project core (list/create/master data)

Scope:
- `resources/js/pages/Dashboard.jsx`
- `resources/js/pages/Profile.jsx` + `resources/js/components/profile/AvatarUpload.jsx`
- `resources/js/pages/ProjectList.jsx`, `CreateProject.jsx`
- `resources/js/pages/ProjectCategoryMaster.jsx`, `ProjectRoles.jsx`

Catatan: `Profile.jsx` sebagian sudah campur Inggris (baseline lama, belum pernah full di-Indonesia-kan) — cek dulu apa yang sudah benar sebelum menerjemahkan ulang.

---

## Phase 3 — Project Board (Kanban core)

Scope:
- `resources/js/pages/ProjectBoard.jsx` (**3.653 baris — file terbesar di app ini**)

**Peringatan konteks:** file ini sendirian kemungkinan besar butuh lebih dari satu kali baca-tulis dalam sesi yang sama. Kerjakan per section (task modal, kanban card, filter toolbar, dialog subtask/assignee) daripada satu edit raksasa. Kalau sesi kehabisan konteks di tengah, lanjutkan sebagai Phase 3 (bukan mulai phase baru) sampai file ini benar-benar selesai sebelum lanjut ke Phase 4.

---

## Phase 4 — Project Board satellites + komponen task

Scope:
- `resources/js/pages/ProjectBoardDashboard.jsx`, `ProjectBoardGantt.jsx`, `ProjectBoardBacklog.jsx`, `ProjectBoardNotes.jsx`
- `resources/js/components/board/*.jsx` (9 file: `AssigneeSearchSelect`, `BillingOverviewDetail`, `DescriptionEditor`, `EpicSearchInput`, `ProjectNotesPanel`, `SubtaskSection`, `TaskAssigneesSection`, `TaskHistorySection`, `TaskNotesSection`)

Perkiraan: ~5.500 baris — berat, kemungkinan 2x sitting.

---

## Phase 5 — Sales & Presales

Scope:
- `resources/js/pages/Sales.jsx` (2.349 baris), `Presales.jsx` (1.275 baris)
- `resources/js/pages/CompanyMaster.jsx`, `SalesCategoryProjectMaster.jsx`
- `resources/js/components/sales/*.jsx` (`PitchOutcomeEditForm`, `QuotationEditorSection`, `QuotationForm`, `QuotationLogoUpload`)

Catatan: `Sales.jsx` men-generate quotation PDF — cek apakah teks quotation (yang tampil di PDF ke klien eksternal) ikut di-scope atau sengaja dipertahankan Indonesia untuk klien lokal. **Ini keputusan bisnis, bukan teknis — konfirmasi dulu sebelum phase ini jalan.**

---

## Phase 6 — Finance

Scope:
- `resources/js/pages/FinanceMonitoring.jsx` (2.055 baris)
- `resources/js/pages/FinanceCategories.jsx`, `FinanceReport.jsx`, `RealizationReport.jsx`

---

## Phase 7 — Reports & Team

Scope:
- `resources/js/pages/Reports.jsx` (1.595 baris)
- `resources/js/pages/GenerateReport.jsx`, `TeamLoad.jsx`, `TeamUsers.jsx`

Catatan: `GenerateReport.jsx` men-generate PDF laporan — sama seperti Phase 5, cek apakah isi PDF ikut di-scope.

---

## Phase 8 — Review System

Scope:
- `resources/js/pages/Review.jsx`, `ReviewConfig.jsx`, `PublicReview.jsx`

Catatan penting: modul ini **baru saja selesai di-translate KE Bahasa Indonesia** di sesi 2026-08-24 (untuk membersihkan hasil translasi-ke-Inggris yang tidak disengaja dari sesi lain). Kalau plan ini dieksekusi, modul ini akan diterjemahkan lagi — kali ini secara sengaja dan resmi — balik ke Inggris. Tidak masalah secara teknis, cuma dicatat di sini biar jelas alurnya kalau ada yang bingung lihat histori.

---

## Phase 9 — System & Integration

Scope:
- `resources/js/pages/Modules.jsx`, `SystemRoles.jsx`, `SystemSettings.jsx`, `SystemLogs.jsx`
- `resources/js/pages/IntegrationProjects.jsx`, `IntegrasiMonitoring.jsx`, `ConnectorMonitoring.jsx`
- `resources/js/components/settings/BrandingAssetUpload.jsx`

---

## Phase 10 — Backend user-facing text + sapuan akhir

Scope:
- Pesan validasi/error Laravel yang balik ke frontend sebagai `message`/`error` (ditampilkan lewat `alert()` atau toast) — sapuan di seluruh `app/Http/Controllers/*.php`
- Template email: `resources/views/emails/*.blade.php` (7 file: `layout`, `login-notification`, `manhour-threshold`, `review-link`, `task-assigned`, `task-due-reminder`, `task-mention`)
- Template PDF (quotation, laporan) — **tunduk pada keputusan bisnis di Phase 5/7** soal apakah dokumen client-facing tetap Indonesia
- Sapuan akhir: grep seluruh `resources/js` untuk kata Indonesia yang lolos dari phase manapun
- Update `.claude/rules/HANDOVER.md` mencatat migrasi bahasa ini selesai

---

## Progress

| Phase | Modul | Status |
|---|---|---|
| 1 | Fondasi (rules, glossary, shared chrome) | ✅ Selesai 2026-08-25 |
| 2 | Dashboard, Profile, Project core | ✅ Selesai 2026-08-25 |
| 3 | Project Board (core) | ✅ Selesai 2026-08-25 |
| 4 | Project Board satellites + komponen task | ✅ Selesai 2026-08-25 |
| 5 | Sales & Presales | ⬜ Belum mulai |
| 6 | Finance | ⬜ Belum mulai |
| 7 | Reports & Team | ⬜ Belum mulai |
| 8 | Review System | ⬜ Belum mulai |
| 9 | System & Integration | ⬜ Belum mulai |
| 10 | Backend text + sapuan akhir | ⬜ Belum mulai |
