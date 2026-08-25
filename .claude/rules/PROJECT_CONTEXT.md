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

### Reports & Export
- [x] Generate Report (project report PDF)
- [x] Reports (company financials, efficiency, revenue trend, dll.)
- [x] System Backup (CSV & SQL dump)

### Review System
- [x] Review Config (evaluation cycles, bobot per pertanyaan, skala skor 1–10)
- [x] Review (trigger & monitor status)
- [x] Public Review Link (share ke klien eksternal tanpa login)

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
