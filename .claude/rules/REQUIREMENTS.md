# Project Requirements: HubTask — Internal Project Management System
**Client:** Internal / Software House
**Vibe Coder:** [Nama Anda]

## 1. Objective
Aplikasi manajemen internal untuk software house / tim IT yang mengcover
siklus penuh dari prospek hingga pelaporan:
Prospek → Sales Pitch → Presales → Project Execution → Finance Monitoring → Laporan.
Tujuan utama: meningkatkan visibilitas project, kontrol manhour, dan
monitoring keuangan secara terpusat dalam satu platform.

## 2. Key Features
- **Auth & RBAC:** Login dengan Laravel Sanctum, role & permission granular
  per modul (Admin, PM, Developer, QA, Designer, Freelance)
- **Project Board:** Kanban board dengan drag & drop, subtask, prioritas,
  estimasi jam, dan Gantt chart
- **Task Management:** Manajemen task dengan assignee, due date, billable flag,
  rush hour multiplier, dan notifikasi email otomatis
- **Manhour Logging:** Pencatatan manhour harian per anggota tim per role
- **Team Load:** Monitoring beban kerja tim secara visual
- **Sales Pipeline:** Tracking sales pitch dari prospek hingga deal won per company
- **Presales:** Manajemen presales dengan role requirement, team assignment,
  dan konversi ke project
- **Finance Monitoring:** Alokasi anggaran, realisasi pembayaran,
  top-up, change request, dan laporan keuangan
- **Laporan & Realisasi:** Generate report project, finance report,
  realization report dalam format PDF
- **Notifikasi Email:** Reminder due date task, digest notifikasi via queue
- **System Settings:** Konfigurasi global app, manajemen user, role, dan
  activity log audit trail
- **Public Review Link:** Share link review project ke klien eksternal

## 3. Design Preferences
- **Warna:** Dark mode — background utama `#000040` (navy gelap),
  card/panel `#151b28`, surface sekunder `#1e2532`,
  accent warna terang (teal/biru)
- **UI Style:** Minimal, professional, dark theme ala dashboard developer tools
- **Referensi Website:** Linear.app, Jira (dark mode), Vercel Dashboard
- **Icon Library:** Lucide React (sudah terpasang)
- **Component Library:** shadcn/ui + Radix UI

## 4. Tech Stack (Actual)
- **Backend Framework:** Laravel 12.x (PHP 8.2+)
- **Frontend:** React 19.x (SPA) + Vite 7.x
- **Database (dev):** SQLite | **(prod):** MySQL / PostgreSQL
- **UI:** Tailwind CSS 4.x + shadcn/ui + Radix UI
- **Auth:** Laravel Sanctum (Bearer token)
- **PDF:** barryvdh/laravel-dompdf
- **Drag & Drop:** @dnd-kit
- **Queue:** Laravel Queue (database driver)
- **Icons:** Lucide React
