# Project Context: HubTask — Internal Project Management System

## Tech Stack (Actual)
- **Backend:** Laravel 12.x (PHP 8.2+) — REST API via `routes/api.php`
- **Frontend:** React 19.x (SPA) + Vite 7.x — bukan Blade template
- **Database (dev & prod, terverifikasi dari `.env`):** MySQL
- **UI:** Tailwind CSS 4.x + shadcn/ui + Radix UI
- **Auth:** Laravel Sanctum (Bearer token, expiry 720 menit default)
- **Icons:** Lucide React
- **PDF:** barryvdh/laravel-dompdf
- **Drag & Drop:** @dnd-kit
- **Queue:** Laravel Queue (database driver)
- **RBAC:** Custom — tabel `modules` (top-level, sumber nama modul/menu) → `permissions` (FK `module_id`, NOT NULL, `restrictOnDelete`) → `permission_role` pivot ke `roles`. Middleware `permission:{slug}`. Modul di-provision otomatis dari `App\Support\PermissionCatalog::menuActionMap()` lewat `sync()`. Akun dengan `users.is_superuser = true` bypass semua permission check (`User::hasPermission()`, `UserAccess::isPrivileged()`) — menggantikan hardcode email check yang lama.

## App Rules & Logic
- Gunakan Bahasa Inggris untuk semua teks di UI.
- Desain dark mode — background `#000040`, card `#151b28`, surface `#1e2532`.
- Semua route API dilindungi `auth:sanctum` + `permission:{slug}` middleware.
- RBAC berbasis slug permission (bukan Spatie), dikelola dari modul System Roles.
- Terdapat tiga level user: Admin/PM (akses penuh), Member (board & manhour), Freelance (view & update status task saja).
- PDF quotation di-generate server-side dan disimpan di storage.
- Notifikasi email dikirim via Laravel Queue (async) — reminder due date, digest.
- Manhour menggunakan multiplier rush hour 1.3x bila flag aktif.
- Semua aktivitas user tercatat di `activity_logs` (audit trail).

## Modules & Current Progress

### Auth & User Management
- [x] Login (Sanctum token)
- [x] Signup
- [x] Logout
- [x] Profile (update data diri)
- [x] RBAC — System Roles & Permissions
- [x] RBAC — Modules/Menus sebagai entitas DB nyata (tabel `modules`, FK dari `permissions`) + halaman admin "Modules" (`/modules`, read + toggle `is_active`/`sort_order`; nama modul tetap code-defined via `PermissionCatalog::menuActionMap()`). Menonaktifkan modul benar-benar memblokir akses (middleware + sidebar), bukan cuma kosmetik.
- [x] Manajemen User (Team Users)
- [x] Password Policy — wajib ganti password tiap 6 bulan (`User::isPasswordExpired()`), tidak boleh reuse 3 password terakhir (`App\Support\PasswordPolicy`, tabel `password_histories`), dipaksa ganti password via halaman `/force-change-password` saat login jika sudah expired
- [x] Notification Center (`/notification-center`) — tiap user atur sendiri 5 toggle email notifikasi independen (task assigned, due reminder, mention, MH top-up threshold, login alert), gantikan toggle bundel lama di Profile. Modul RBAC sendiri (`notification_center.read`/`update`), digrant otomatis ke semua role yang sudah punya akses Profile.

### Core Project
- [x] Project List
- [x] Create Project
- [x] Project Board (Kanban + drag & drop)
- [x] Project Board — Dashboard (overview per project)
- [x] Project Board — Backlog
- [x] Project Board — Gantt Chart
- [x] Project Board — Notes
- [x] Task Management (CRUD, subtask, assignee, due date, priority, billable, rush hour, duplicate/clone task dengan opsi ikut subtask, multi-assignee dengan status aktif per task)
- [x] Task Notes (@mention anggota project di komentar + notifikasi email & in-app bell ke yang di-mention)
- [x] Notifikasi in-app (bell) + email untuk 4 aktivitas: @mention di task notes, task-assigned, due-date reminder, MH top-up threshold — semua via Laravel Notification (`database` + `mail` channel), in-app selalu tercatat walau user matiin toggle email personal
- [x] Notifikasi threshold MH per top-up (50/70/90%) untuk project Agile — ke role Project Manager & Project Director yang jadi member project tsb, dihitung per top-up individual (FIFO bucket), bukan dari total MH project
- [x] Manhour Logging
- [x] Project Members & Role Quotas
- [x] Team Load Monitoring
- [x] Project Roles
- [x] Project Board — filter task per project role (dropdown "Semua Role", kombinasi dengan filter member/My Task) + tab list project (Aktif/Done/Favorit) sync ke query param URL (`?tab=done`/`?tab=favorite`), jadi bisa di-refresh/bookmark/share tetap di tab yang sama.
- [x] **Weekly Report** (`/weekly-report`) — checklist mingguan per "Board" (mis. "Weekly Report Project", "Weekly Report Management"), tiap Board punya member list eksplisit (akses & kandidat assignee dibatasi ke member board itu). Board → Period (1 minggu) → Item (Reporter, Deskripsi, Issue Level Low/Medium/High, Project opsional, Due Date, multi-assignee). Duplicate period ke minggu berikutnya dengan pilihan bawa item Done atau tidak (item belum-Done selalu ikut). Notifikasi assign + due-reminder harian, toggle terpisah di Notification Center.

### Sales & Presales
- [x] Sales Pipeline (Sales Pitch)
- [x] Quotation Generator (PDF, logo, preview)
- [x] Presales Pipeline
- [x] Konversi Presales → Project
- [x] Company Master
- [x] Project Category Master
- [x] Sales Category Project Master

### Finance
- [x] Finance Monitoring (alokasi, realisasi, top-up, change request)
- [x] Finance Categories
- [x] Finance Report
- [x] Realization Report
- [x] **Client Monitoring** (`/client-monitoring`) — view read-only untuk akun eksternal (`users.user_type = 'client'`, terikat `users.company_id`): total MH quota vs terpakai di level company (rollup semua project company itu) + drill-down per project (breakdown per role + FIFO bucket, sama persis dengan `ProjectController::quotas()` lewat helper bersama `App\Support\ProjectQuotaBreakdown`) + riwayat change request. **Tidak ada nilai Rupiah maupun detail task** (assignee/judul task) di endpoint ini sama sekali — cuma jam. Akses default **company-wide** (semua project di bawah `projects.company_id` milik user itu); admin bisa membatasi ke subset project via tabel pivot `client_user_projects` (kosong = tanpa batasan). Role sistem baru "Client" (permission `client_monitoring.read` + `profile.*` + `notification_center.*` saja, tidak ada akses board/finance/internal). User client dikelola dari halaman **Teams & Users** yang sama (bukan halaman terpisah) — form dapat toggle "Account Type" (Internal/Client), muncul Company selector + checklist "Restrict to specific projects" saat dipilih Client. `projects.company_id` (kolom baru, nullable) auto-terisi dari `presales.company_id` saat presale di-convert ke project (`PresaleController::proceedToProject()`), atau dipilih manual di form Create Project. Endpoint `assignmentOptions()` (modal "Assign Project Members") sudah difilter `user_type = 'internal'` supaya akun client tidak pernah muncul sebagai kandidat assignee/member.

### Reports & Export
- [x] Generate Report (project report PDF)
- [x] Reports (company financials, efficiency, revenue trend, dll.)
- [x] System Backup (CSV & SQL dump)

### Review System
- [x] Review Config (evaluation cycles, bobot per pertanyaan, skala skor 1–10). Pertanyaan berbobot: field Deskripsi/Panduan punya toggle **wajib atau opsional** (kolom `review_questions.description_required`, default `false` = opsional). Pertanyaan "Tanpa bobot" tetap selalu mewajibkan deskripsi.
- [x] Review (trigger & monitor status)
- [x] Public Review Link (share ke klien eksternal tanpa login)
- [x] Nonaktifkan (exclude) submission review — toggle per submission di modal project (`/review?project=X`), kolom `project_reviews.excluded_at`/`excluded_by`, endpoint `PATCH /projects/{id}/reviews/{reviewId}/exclusion` (`review.update`). Submission excluded tetap tersimpan & tampil di history (redup + badge "Tidak dihitung") tapi di-skip dari Skor Overall, radar chart, dan proporsi dashboard. Reversible. Tidak ada hapus permanen. Tidak mempengaruhi gate `max_submissions`/`one_per_user`.
- [x] Permission `review.view_all` ("View All Projects", dicentang per-role di Access Control → modul Review) — role dengan aksi ini (atau akun privileged) melihat data review SEMUA project di `/review`; tanpa itu hanya project yang di-assign. Ditegakkan lewat `ProjectAccess::canAccessProjectReview()`/`applyReviewProjectScope()` di seluruh `ProjectReviewController` + `GET /review/projects`. Default: cuma di-grant ke role Admin.
- [x] Dashboard `/review` list "Status Review per Project" — chip per siklus evaluasi (trigger-aware): `summary().data[]` punya `cycle_state` (submitted/due/waiting/open) + `trigger{target,current,is_triggered}` dari `computeTriggerStatus()`. Chip: terisi / siap diisi / belum waktunya (X%/Y%) / terjadwal manual. Bucket chart (Sudah/Sebagian/Belum/Tanpa Evaluasi) tidak berubah. List punya tab All/Waterfall/Agile Scrum + dropdown sort (mendesak/nama/skor/terakhir direview) + pagination 10/halaman (frontend `ReviewDashboard`).
- [x] Skor per-evaluasi & Skor Overall di modal `/review?project=X` = rata-rata SEMUA submission yang dihitung (bukan latest). `summary()` mengembalikan `total_score` (avg per-eval), `latest_score`, `submission_count`, `reviewers[]` (semua nama+company+skor), `overall` (avg flat semua submission), `overall_count`. Konsisten dengan radar chart yang memang selalu pakai AVG. Kartu evaluasi mendaftar semua reviewer ("Oleh A, B, C") + klik skor → view rekap agregat (`EvaluationAggregateDetail`: skor rata-rata, semua reviewer, per-pertanyaan avg + semua komentar).
- [x] Tab Kalibrasi — chart "Distribusi Skor" sebelum vs sesudah kalibrasi (good/fair/poor atas semua submission yang lolos filter, "sesudah" cuma beda untuk yang sudah dikunci) + filter tahun (`?calib_year=`, default tahun berjalan, opsi dari `meta.available_years`).
- [x] Tab **Kalibrasi** di `/review` (`?methodology=calibration`, permission `review.calibrate` — badge "calib" di Access Control → modul Review, default grant Admin saja). Role dengan akses memberi suara **Setuju/Tidak Setuju per pertanyaan** pada tiap submission; "Tidak Setuju" **wajib** isi skor usulan 1–10 + alasan. Pertanyaan valid bila `agree/votes > 60%` (strict); penilaian **Valid** bila `>60%` pertanyaan yang sudah ada suaranya lolos; belum ada suara → "Belum dikalibrasi". Skor efektif pertanyaan = rata-rata semua kalibrator (skor reviewer utk yang Setuju, skor usulan utk yang Tidak Setuju); `calibrated_score` = weighted total dari skor efektif. **Menggantikan skor asli di SEMUA agregasi** (Skor Overall, radar, proporsi dashboard, kartu project) **hanya setelah di-"Kunci" manual** (`POST/DELETE /projects/{id}/reviews/{reviewId}/calibration/lock`) — sebelum dikunci semua agregasi tetap pakai skor asli. Kolom: `review_calibration_votes.proposed_score`/`reason`, `project_reviews.calibrated_score`/`calibration_locked_at`/`calibration_locked_by`, `project_review_answers.calibrated_score` (snapshot saat lock). Tabel `review_calibration_votes` (`rcv`), helper `App\Support\ReviewCalibration::summarize()` (+ `ProjectReview::aggregateScore()`), `ReviewCalibrationController`. Frontend: `CalibrationTab` + `CalibrationDialog` di `Review.jsx`, state list di URL prefix `calib_`; radar & `summary()` pakai `COALESCE(calibrated_score, score)` / `aggregateScore()`.

### Integration
- [x] Integration Projects
- [x] Integrasi Monitoring
- [x] Connector Monitoring
- [x] Global Integration (API key management)

### System
- [x] Dashboard (overview metrics)
- [x] System Settings (branding, SMTP, app config)
- [x] System Logs (activity log audit trail)
- [x] Report Schedules (email otomatis terjadwal)
- [x] Announcements (`/announcements`) — broadcast informasi (info/success/warning/danger, optional expiry, optional lampiran dokumen max 10MB) yang tampil di halaman login untuk semua orang; publik lewat endpoint tanpa auth. Modul RBAC Admin-only secara default.
