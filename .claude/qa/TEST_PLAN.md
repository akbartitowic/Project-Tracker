# QA Test Plan — HubTask (Full Regression)

Draft untuk direview dulu. Setelah disetujui/direvisi, eksekusi dimulai dan kolom **Status**
+ **Catatan/Bukti** diisi per skenario sesuai hasil nyata.

## Status (diisi saat eksekusi)

| Status | Arti |
|---|---|
| `Passed` | Berjalan sesuai Expected Result |
| `Bug` | Berjalan tidak sesuai Expected Result — defect |
| `Reopen` | Sebelumnya Passed/fixed, sekarang regresi lagi |
| `Need Adjustment` | Jalan, tapi perlu perubahan (validasi kurang ketat, pesan error tidak jelas, dst.) |
| `Suggestion Adjustment` | Bukan defect, saran perbaikan UX/produk — opsional dikerjakan |
| *(kosong)* | Belum dieksekusi |

## Cara Eksekusi (kolom **Exec**)

| Exec | Arti |
|---|---|
| `API` | Bisa saya eksekusi langsung — request ke endpoint asli / `tinker` dengan data disposable (dibuat & dibersihkan lagi), verifikasi dari response/DB state nyata. |
| `UI` | Murni visual/interaksi browser (drag-drop, warna, animasi, clipboard, dll.) — saya tidak punya browser nyata di environment ini (Playwright gagal diinstall di sesi-sesi sebelumnya), jadi ini **perlu dieksekusi manual olehmu**; saya cuma bisa audit dari kode. |
| `Mixed` | Ada bagian yang bisa saya verifikasi via API (data/logic-nya), tapi ada nuansa visual yang tetap perlu dicek manual. |

Total skenario: **187** (positif + negatif), terbagi 11 modul. Skenario yang ditandai *(negative)* fokus ke validasi input, permission, edge case, dan boundary condition — bukan cuma happy path. Nomor ID dipakai untuk referensi silang saat ada bug/follow-up.

---

## 1. AUTH — Login, Signup, Profile, Password Policy

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| AUTH-01 | Login sukses | `POST /login` kredensial valid | 200, dapat token + data user | API | Passed | Lihat `results/BATCH-01.md` |
| AUTH-02 | Login gagal — password salah | `POST /login` password salah | 401/422, pesan generik (tidak bocorkan email terdaftar/tidak) | API | Passed | Lihat `results/BATCH-01.md` |
| AUTH-03 | Rate limit login | 11x `POST /login` dalam 1 menit | Percobaan ke-11 kena 429 | API | Passed | Suggestion Adjustment: pesan 429 bahasa Inggris, beda dari limiter umum. `results/BATCH-01.md` |
| AUTH-04 | Signup aktif | `POST /signup` saat `allow_public_signup=true` | 201, user baru dibuat | API | Passed | Diuji via `Config::set()` terisolasi (live `.env`=false, tidak diubah). `results/BATCH-01.md` |
| AUTH-05 | Signup nonaktif | `POST /signup` saat `allow_public_signup=false` | Ditolak (403/404 sesuai implementasi) | API | Passed | Lihat `results/BATCH-01.md` |
| AUTH-06 | Rate limit signup | 6x `POST /signup` dalam 1 menit | Percobaan ke-6 kena 429 | API | Passed | Sama seperti AUTH-03, pesan bahasa Inggris. `results/BATCH-01.md` |
| AUTH-07 | Logout invalidasi token | `POST /logout` lalu pakai token lama | Token lama 401 di request berikutnya | API | Passed | Lihat `results/BATCH-01.md` |
| AUTH-08 | GET /me akurat | `GET /me` dengan token valid | Data user sesuai token, termasuk `password_expired` | API | Passed | `menu_items` unfiltered dikonfirmasi by-design. `results/BATCH-01.md` |
| AUTH-09 | Update profile tanpa ganti password | `PUT /profile` tanpa field `password` | 200, `force_logout: false`, token lama tetap valid | API | Passed | Suggestion Adjustment: `email` wajib dikirim; error tanpa header Accept jadi HTML redirect bukan JSON. `results/BATCH-01.md` |
| AUTH-10 | Update profile ganti password valid | `PUT /profile` dengan password baru valid | 200, `force_logout: true`, semua token lama invalid | API | Passed | Lihat `results/BATCH-01.md` |
| AUTH-11 | Reuse password ditolak | Ganti password ke salah satu dari 3 password terakhir | 422 pesan reuse | API | | |
| AUTH-12 | Rolling window reuse | Ganti password ke password ke-4 (di luar window 3) | Diterima (200) | API | | |
| AUTH-13 | Password expired → dipaksa ganti | Set `password_changed_at` >6 bulan lalu, login | Response `password_expired: true`; FE redirect `/force-change-password` | Mixed | | |
| AUTH-14 | Force-change-password — current password salah | `POST /force-password-change` current_password salah | 422 "Password saat ini salah." | API | | |
| AUTH-15 | Force-change-password sukses | `POST /force-password-change` valid | 200, `force_logout: true`, token lama invalid | API | | |
| AUTH-16 | Login notification best-effort | Login dengan SMTP sengaja down/salah | Login tetap sukses (200), gagal kirim email cuma tercatat di activity log, tidak menggagalkan login | API | | |
| AUTH-17 | Token expiry (Sanctum) | Pakai token setelah lewat `SANCTUM_TOKEN_EXPIRATION_MINUTES` | Token ditolak (401) | API | | |
| AUTH-18 | `PUT /profile` tanpa field `nickname` sama sekali | Kirim body tanpa `nickname` | **Known issue** (HANDOVER): pernah crash 500 "Undefined array key nickname" — cek masih reproduce atau sudah fallback aman | API | | |
| AUTH-19 *(negative)* | Login — email tidak terdaftar | `POST /login` email yang tidak ada di DB | 401/422, pesan **sama persis** dengan password salah (tidak bocorkan email terdaftar/tidak) | API | | |
| AUTH-20 *(negative)* | Login — field kosong | `POST /login` tanpa `email`/`password` | 422 validasi, bukan 500 | API | | |
| AUTH-21 *(negative)* | Login — user status inactive | Login dengan user `status='inactive'` tapi password benar | Ditolak, tidak dapat token | API | | |
| AUTH-22 *(negative)* | Signup — email sudah terdaftar | `POST /signup` dengan email yang sudah ada | 422 unique constraint | API | | |
| AUTH-23 *(negative)* | Signup — format email invalid | `POST /signup` dengan `email` bukan format email | 422 | API | | |
| AUTH-24 *(negative)* | Update profile — email diubah ke email user lain | `PUT /profile` `email` yang sudah dipakai user lain | 422 unique constraint | API | | |
| AUTH-25 *(positive)* | Update profile — ubah field non-password saja | `PUT /profile` ubah `nickname`/`phone_number` saja | 200, field lain (password, dll.) tidak berubah, `force_logout: false` | API | | |
| AUTH-26 *(negative)* | Ganti password — password baru = password saat ini | Kirim `password` baru yang sama persis dengan password aktif | 422 (dianggap reuse, password aktif termasuk dalam window cek) | API | | |
| AUTH-27 *(positive)* | Login dari 2 device berbeda | Login 2x berturut-turut dengan User-Agent/IP berbeda | 2 email notifikasi login terpisah terkirim, masing2 dengan device/IP yang benar (`ClientInfo::device()`) | API | | |
| AUTH-28 *(positive)* | `GET /branding` publik tanpa auth | Hit endpoint tanpa header Authorization | 200, data logo/app name terbaca (endpoint memang publik) | API | | |

---

## 2. RBAC & Access Control

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| RBAC-01 | Middleware permission blok akses | Hit endpoint ber-`permission:` tanpa slug tsb di role user | 403 | API | | |
| RBAC-02 | `is_superuser` bypass semua | User `is_superuser=true` tanpa permission apapun | Semua endpoint tetap bisa diakses | API | | |
| RBAC-03 | Role "Admin" privileged bypass `ProjectAccess` | User role Admin akses project yang bukan dia member | Tetap bisa (privileged bypass) | API | | |
| RBAC-04 | Nonaktifkan modul blok akses | Set `modules.is_active=false` untuk suatu modul, hit endpoint di bawahnya | 403 backend; sidebar/menu hilang di FE | Mixed | | |
| RBAC-05 | Modul "Modules Management" tidak bisa dinonaktifkan sendiri | `PATCH` toggle `is_active=false` pada modul itu sendiri | Ditolak (guard self-lockout) | API | | |
| RBAC-06 | Role "admin" tidak bisa di-rename/dihapus | `PUT`/`DELETE` role bernama "admin" | Ditolak | API | | |
| RBAC-07 | Assign role Admin — hanya privileged user | Non-privileged user assign role Admin ke user baru | Ditolak; privileged user berhasil | API | | |
| RBAC-08 | Non-privileged tidak bisa ubah akun privileged lain | User biasa `PUT /users/{id}` ke akun privileged | Ditolak | API | | |
| RBAC-09 | Tidak bisa hapus akun sendiri | `DELETE /users/{own_id}` | Ditolak | API | | |
| RBAC-10 | CRUD `menu_items` | Create menu item dengan `path` invalid (bukan `/...`) atau `icon` yang tidak ada di registry FE | Backend validasi format `path`; **cek apakah `icon` divalidasi** (Known Issue — kemungkinan belum) | API | | |
| RBAC-11 | Spot-check slug vs endpoint nyata | Bandingkan beberapa slug (`project_board.*`, `finance_monitoring.*`, `list_project.*`) dengan middleware di `routes/api.php` | Konsisten, tidak ada endpoint sensitif tanpa `permission:` | API | | |
| RBAC-12 *(negative)* | Token yang sudah di-revoke dipakai lagi | Force-logout (ganti password) lalu pakai token lama | 401 di semua endpoint | API | | |
| RBAC-13 *(negative)* | User read-only coba aksi tulis | User cuma punya `project_board.read`, coba `POST/PUT/DELETE` task | 403 | API | | |
| RBAC-14 *(positive)* | Permission granular campuran | User dengan `project_board.read` tanpa `.update` | `GET` berhasil, `PUT`/`PATCH` ditolak — bukan all-or-nothing | API | | |
| RBAC-15 *(negative)* | Hapus modul yang masih punya permission | `DELETE` modul yang masih direferensikan `permissions.module_id` | Ditolak (FK `restrictOnDelete`) | API | | |
| RBAC-16 *(negative)* | Buat permission dengan module_id tidak ada | `POST` permission dengan `module_id` yang tidak exist | Ditolak (FK constraint / 422) | API | | |
| RBAC-17 *(positive)* | `PermissionCatalog::sync()` idempotent | Jalankan `sync()` 2x berturut-turut | Tidak ada baris `modules`/`permissions` duplikat | API | | |

---

## 3. Core Project — List & Board

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| PROJ-01 | Create project — validasi field wajib | `POST /projects` tanpa `name` | 422 | API | | |
| PROJ-02 | Bulk delete project | `DELETE /projects` — hanya `list_project.delete` | User tanpa permission ditolak; dengan permission berhasil | API | | |
| PROJ-03 | Assign member baru (non-admin) | Non-superuser role non-"Admin" dengan `list_project.update` cari user utk ditambah | `assignmentOptions()` balikin SEMUA user sistem, bukan cuma existing member (regression fix) | API | | |
| PROJ-04 | Non-member akses assignmentOptions/syncMembers | User dengan `list_project.update` tapi bukan member project manapun | 403 (tetap perlu jadi member project itu, kecuali superuser/Admin) | API | | |
| PROJ-05 | Update status project | `PATCH /projects/{id}/status` | Status berubah sesuai payload | API | | |
| PROJ-06 | Tab Aktif/Done/Favorit sync ke URL | Klik tab di list project | `?tab=done`/`?tab=favorite` muncul di URL, persist saat refresh | UI | | |
| PROJ-07 | Filter task per project role | Pilih dropdown role di board | Task ter-filter sesuai role, bisa dikombinasi filter member/My Task | UI | | |
| PROJ-08 | Freelance tidak lihat dropdown filter role | Login sebagai Freelance, buka board | Dropdown filter project role tersembunyi | UI | | |
| PROJ-09 *(negative)* | Akses project yang tidak ada | `GET /projects/999999/members` | 404 | API | | |
| PROJ-10 *(negative)* | Non-privileged bukan member akses project lain | User biasa (bukan superuser/Admin, bukan member) akses `GET /projects/{id}/notes` project lain | 403 | API | | |
| PROJ-11 *(negative)* | `end_date` sebelum `start_date` | `POST /projects` dengan `end_date` < `start_date` | Cek: ditolak validasi, atau lolos tanpa guard (kalau lolos → catat `Suggestion Adjustment`) | API | | |
| PROJ-12 *(positive)* | Update status loncat non-sequential | `PATCH /projects/{id}/status` langsung Planning → Done (skip In Progress) | Diterima (tidak ada state-machine ketat) — dokumentasikan sebagai expected | API | | |
| PROJ-13 *(negative)* | Update status dengan value sembarangan | `PATCH /projects/{id}/status` dengan string bebas di luar status yang dikenal | Cek: ditolak validasi, atau tersimpan mentah (kalau tersimpan mentah → catat `Suggestion Adjustment`, harusnya whitelist) | API | | |

---

## 4. Task Management (Kanban Board)

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| TASK-01 | Task baru selalu ke atas kolom | `POST /tasks` di kolom yang sudah ada isi | `sort_order=0`, tampil paling atas | API | | |
| TASK-02 | Drag tanpa permission | User tanpa `project_board.update` coba drag | Drag disabled (FE), tidak ada request `PUT status` terkirim | UI | | |
| TASK-03 | Drag berhasil — reorder | Pindah task ke kolom lain | Task lain di kolom tujuan `sort_order` increment; task pindah `sort_order=0` | Mixed | | |
| TASK-04 | Whitelist status | `PUT /tasks/{id}/status` dengan status di luar whitelist | 422 (bukan lagi `string` bebas) | API | | |
| TASK-05 | Subtask nesting max 1 level | Coba tambah subtask ke subtask | Ditolak | API | | |
| TASK-06 | Sync estimated_hours parent | Tambah/ubah subtask billable | `estimated_hours` parent = sum subtask billable (`TaskAggregationService`) | API | | |
| TASK-07 | Duplicate tanpa subtask | `POST /tasks/{id}/duplicate` tanpa `include_subtasks` | Clone masuk To Do teratas, `duplicated_from_id` terisi, field lain identik | API | | |
| TASK-08 | Duplicate dengan subtask | `POST /tasks/{id}/duplicate` dengan `include_subtasks=true` | Subtask ikut clone, status reset To Do, `duplicated_from_id` masing2 ke asal | API | | |
| TASK-09 | Duplicate subtask ditolak | `POST /tasks/{subtask_id}/duplicate` | 422 | API | | |
| TASK-10 | Bulk delete cascade subtask | `DELETE /tasks/bulk-delete` untuk task ber-subtask | Subtask ikut terhapus (FK cascade) | API | | |
| TASK-11 | Import CSV | `POST /tasks/import` dengan file sesuai/tidak sesuai template | Sesuai: berhasil; tidak sesuai: error jelas per baris | API | | |
| TASK-12 | Mention dibatasi member project | Ketik `@` di task notes | Dropdown cuma isi anggota project (bukan seluruh user sistem) | UI | | |
| TASK-13 | Mention trigger notifikasi | Submit note dengan `@User` | User yang di-mention dapat notif in-app + email (jika toggle aktif); penulis sendiri tidak self-notify | API | | |
| TASK-14 | Toggle aktif multi-assignee independen | Toggle `active_ids[]` beberapa assignee | Bisa banyak/semua aktif sekaligus atau tidak ada, bukan radio single-choice | API | | |
| TASK-15 | `assignee_id` primary pointer | Ubah kombinasi `active_ids` | `assignee_id` = `min(active_ids)` kalau ada yang aktif, else `min(assignee_ids)`, else null | API | | |
| TASK-16 | Split MH manual per-assignee | Edit `mh_by_assignee` salah satu assignee | `estimated_hours` task = total semua `mh` | API | | |
| TASK-17 | "Bagi Rata" tidak auto-trigger | Tambah/hapus/toggle assignee tanpa klik "Bagi Rata" | MH tiap assignee TIDAK berubah otomatis | API | | |
| TASK-18 | Split MH ditolak jika ada subtask | `mh_by_assignee`/`split_evenly` pada task ber-subtask | 422 | API | | |
| TASK-19 | Field Estimated Manhours disabled | Buka task dengan assignee ≥ 2 | Field utama disabled + hint, input via section split saja | UI | | |
| TASK-20 | Reminder due-date ke semua assignee | Task due besok, ≥2 assignee | Semua assignee dapat reminder in-app, dedup harian per task (bukan per user) | API | | |
| TASK-21 | Rate limit 300/menit | Burst >300 request/menit dari 1 user | 429 dengan pesan `Terlalu banyak permintaan...` + `retry_after`; FE tampil toast (bukan alert polos) | Mixed | | |
| TASK-22 *(negative)* | `estimated_hours` negatif | `POST /tasks` dengan `estimated_hours=-5` | 422 | API | | |
| TASK-23 *(negative)* | `project_id` tidak ada | `POST /tasks` dengan `project_id` yang tidak exist | 404/422 | API | | |
| TASK-24 *(negative)* | Assign ke user bukan member project | `updateAssignees` dengan user yang belum jadi member project | `ensureAssigneeIsProjectMember()` otomatis menambahkannya sbg member (bukan ditolak) — verifikasi behavior ini sesuai desain | API | | |
| TASK-25 *(negative)* | Update task tanpa permission | User tanpa `project_board.update` — `PUT /tasks/{id}` | 403 | API | | |
| TASK-26 *(negative)* | Hapus task yang tidak ada | `DELETE /tasks/999999` | 404 | API | | |
| TASK-27 *(positive)* | Reminder due-date tepat jam 08:00 lokal | Task due besok, jalankan command jam 08:00 waktu lokal user | Reminder terkirim tepat 1x | API | | |
| TASK-28 *(negative)* | Reminder tidak terkirim untuk task Done | Task status Done dengan `due_date` sudah lewat | Command skip, tidak ada reminder terkirim | API | | |
| TASK-29 *(negative)* | Import CSV — baris format salah | `POST /tasks/import` dengan baris kolom wajib kosong/format tanggal salah | Error jelas per baris, bukan crash 500, baris valid lain tetap ter-import | API | | |
| TASK-30 *(negative)* | Bulk delete — `ids` kosong | `DELETE /tasks/bulk-delete` dengan `{ids: []}` | Ditolak validasi (bukan menghapus semua task) | API | | |
| TASK-31 *(negative)* | `active_ids` berisi id di luar `assignee_ids` | `updateAssignees` kirim `active_ids` yang bukan bagian `assignee_ids` | Diintersect diam-diam (id asing diabaikan), bukan error 422 | API | | |
| TASK-32 *(negative)* | Split MH — `mh_by_assignee` sertakan user_id yang bukan assignee task | Kirim `mh_by_assignee` dengan `user_id` di luar daftar assignee task | Diabaikan / tidak mempengaruhi assignee yang valid | API | | |

---

## 5. Manhour Logging, Team Load, MH Threshold Alert

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| MH-01 | Log manhour dasar | `POST /manhours` | Tersimpan dengan hours/role/description benar | API | | |
| MH-02 | Rush hour multiplier | Task dengan `rush_hour=true` masuk perhitungan cost | Cost dikali 1.3x | API | | |
| MH-03 | Top-up jam | `POST /projects/{id}/top-up` | `quota_hours` role bertambah, bucket FIFO baru | API | | |
| MH-04 | Quota transfer antar role | `POST /projects/{id}/quota-transfer` | Quota role asal berkurang, tujuan bertambah | API | | |
| MH-05 | Nonaktifkan role quota | `POST .../role-quotas/{id}/deactivate` | Quota nonaktif, tidak masuk perhitungan baru | API | | |
| MH-06 | Team Load distribusi harian | Task dengan start/due date | Jam terdistribusi per hari kerja, exclude tanggal libur | API | | |
| MH-07 | Team Load multi-assignee proporsional | Task 10 MH split 7:3 ke 2 assignee | Team Load masing2 assignee ~7 dan ~3 jam (bukan 10 dan 10) | API | | |
| MH-08 | Threshold alert no-op non-Agile | Project Waterfall top-up MH sampai >90% | Tidak ada notifikasi terkirim | API | | |
| MH-09 | Threshold per top-up, bukan total | 2 top-up berbeda di role sama, satu penuh satu belum | Threshold dihitung terpisah per top-up (FIFO bucket) | API | | |
| MH-10 | Lompat multi-threshold sekaligus | Consumed naik dari 40% → 95% dalam 1 perubahan | 3 notifikasi terpisah (50/70/90), bukan cuma 1 | API | | |
| MH-11 | Idempotent, tidak dobel kirim | Re-run `checkProject()` tanpa perubahan data | Tidak ada notifikasi baru untuk threshold yang sudah tercatat | API | | |
| MH-12 | Penerima via system role ATAU project role | Member dengan project_role "Project Director" tapi system role "Admin" | Tetap menerima notifikasi (regression fix hari ini) | API | | |
| MH-13 | Bukan member project tidak menerima | User role PM/Director tapi bukan member project ybs | Tidak menerima notifikasi | API | | |
| MH-14 | Trigger real-time di titik yang benar | Ubah `estimated_hours` task billable via update/duplicate/import/bulkEditManhours | Threshold re-check terpanggil (best-effort, gagal tidak batalkan aksi utama) | API | | |
| MH-15 | Tidak trigger dari aksi yang tidak relevan | Drag status Kanban, change request, deactivate quota | Threshold check TIDAK terpanggil | API | | |
| MH-16 *(negative)* | Top-up jam negatif/nol | `POST /projects/{id}/top-up` dengan `topup_hours <= 0` | 422 | API | | |
| MH-17 *(negative)* | Quota transfer melebihi sisa quota asal | `POST .../quota-transfer` dengan jumlah > quota role asal | Cek: ditolak, atau lolos jadi negatif (kalau lolos negatif → catat `Bug`) | API | | |
| MH-18 *(negative)* | Log manhour — `hours` negatif | `POST /manhours` dengan `hours=-2` | 422 | API | | |
| MH-19 *(negative)* | Log manhour untuk role tanpa quota di project | `POST /manhours` dengan `project_role_id` yang tidak punya `project_role_quotas` aktif di project itu | Cek: ditolak, atau tetap tersimpan tanpa guard (dokumentasikan hasilnya) | API | | |
| MH-20 *(positive)* | Consumed turun lagi tidak "un-notify" | Threshold 50% sudah terkirim, lalu task dihapus sampai consumed turun <50%, lalu naik lagi ke 50% | Tidak terkirim ulang (threshold tetap tercatat di `notified_thresholds`, tidak direset) | API | | |
| MH-21 *(negative)* | `checkProject()` untuk project tidak ada/terhapus | Panggil `ManhourThresholdService::checkProject()` dengan `project_id` yang tidak exist | Early return, tidak error/exception | API | | |

---

## 6. Sales Pipeline & Presales

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| SALES-01 | Buat sales pitch | `POST /sales-pitches` | `current_step=new_prospect` | API | | |
| SALES-02 | Step progression | `PUT /sales-pitches/{id}` ubah `current_step` berurutan | sent_compro → proposal_sent → presentation → negotiation valid | API | | |
| SALES-03 | Outcome win → quotation | Set `outcome=win`, generate quotation | PDF ter-generate & tersimpan di storage | API | | |
| SALES-04 | Outcome lost wajib alasan | Set `outcome=lost` tanpa alasan | Validasi menolak / field alasan wajib | API | | |
| SALES-05 | Link won deal ke presale | `POST /sales-pitches/{id}/link-won-presale/{presaleId}` | Presale ter-link ke sales pitch (1:1) | API | | |
| SALES-06 | Preview vs generate quotation | `POST .../quotation/preview` lalu `.../quotation/generate` | Preview tidak simpan file; generate simpan permanen | API | | |
| SALES-07 | Upload/hapus logo quotation | `POST`/`DELETE .../quotation/logo` | Logo ter-update di quotation berikutnya | API | | |
| SALES-08 *(negative)* | Create tanpa field wajib | `POST /sales-pitches` tanpa `title`/`prospect_name` | 422 | API | | |
| SALES-09 *(negative)* | Outcome win tanpa nilai deal | Set `outcome=win` tanpa `final_deal_value` | Cek: wajib diisi (422), atau boleh kosong (dokumentasikan) | API | | |
| SALES-10 *(negative)* | `current_step` diubah mundur | `PUT /sales-pitches/{id}` set `current_step` dari `negotiation` balik ke `sent_compro` | Cek: dibolehkan bebas, atau divalidasi urutan maju saja (dokumentasikan hasil aktual) | API | | |
| PRESALES-01 | Buat presale dari won deal | Convert dari sales pitch won | Data company/category ke-link otomatis | API | | |
| PRESALES-02 | Step Business + acknowledge | `PUT .../business` lalu `POST .../business/acknowledge` | `business_acknowledged_at/by` terisi | API | | |
| PRESALES-03 | Step Development + acknowledge | `PUT .../development` lalu acknowledge | `development_acknowledged_at/by` terisi | API | | |
| PRESALES-04 | Step Operation assign tim + acknowledge | `PUT .../operation` assign role, acknowledge | `operation_acknowledged_at/by` terisi | API | | |
| PRESALES-05 | Proceed to Project sebelum semua acknowledge | `POST .../proceed-project` sebelum 3 step lengkap | Ditolak | API | | |
| PRESALES-06 | Proceed to Project sukses | Setelah 3 step acknowledge, proceed | Project baru dibuat status Planning, member dari operation assignments | API | | |
| PRESALES-07 *(negative)* | Proceed to Project 2x | `POST .../proceed-project` untuk presale yang sudah `converted_project_id` terisi | Ditolak (sudah pernah convert) | API | | |
| PRESALES-08 *(negative)* | Acknowledge development sebelum business | `POST .../development/acknowledge` sebelum `business_acknowledged_at` terisi | Cek: dipaksa urut (ditolak), atau bebas urutan (dokumentasikan) | API | | |
| PRESALES-09 *(negative)* | Assign role operation — `project_role_id` tidak ada | `PUT .../operation` dengan `project_role_id` yang tidak exist | 422 | API | | |

---

## 7. Finance Monitoring & Report

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| FIN-01 | Tambah alokasi normal | `POST /project-allocations` | Tersimpan dengan category/amount benar | API | | |
| FIN-02 | Top-up sebagai alokasi | Alokasi dengan `is_topup=true` | `topup_hours` terisi, masuk bucket FIFO | API | | |
| FIN-03 | Change Request wajib field | Alokasi `is_change_request=true` tanpa `cr_date`/`cr_feature` | Ditolak validasi | API | | |
| FIN-04 | Realisasi alokasi | `PUT .../realization` | `realized_amount`/`realized_at` terisi | API | | |
| FIN-05 | Tandai sudah dibayar | `PUT .../paid` | `paid_at`/`paid_amount` terisi | API | | |
| FIN-06 | Finance Report ringkasan | `GET /financial-reports/summary` | Angka sesuai data alokasi/realisasi aktual | API | | |
| FIN-07 | Realization Report per project | `GET /financial-reports/project-realization` | Realisasi vs plan akurat per project | API | | |
| FIN-08 *(negative)* | Alokasi dengan `amount` negatif | `POST /project-allocations` dengan `amount=-100` | 422 | API | | |
| FIN-09 *(negative)* | Realisasi melebihi alokasi | `PUT .../realization` dengan `realized_amount` > `amount` alokasi | Cek: ditolak, atau lolos tanpa guard (kalau lolos → catat `Suggestion Adjustment`) | API | | |
| FIN-10 *(negative)* | Hapus finance category yang masih dipakai | `DELETE` category yang masih direferensikan `project_allocations.category_id` | Cek FK: ditolak (restrict) atau cascade — pastikan tidak bikin data allocation orphan | API | | |
| FIN-11 *(negative)* | `paid_amount` melebihi `amount` | `PUT .../paid` dengan `paid_amount` > `amount` alokasi | Cek: ditolak, atau lolos tanpa guard (dokumentasikan) | API | | |

---

## 8. Reports & Export

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| REPORT-01 | Generate report PDF | `POST /reports/generate` | PDF ter-generate sesuai data project | API | | |
| REPORT-02 | Reports analytics | `GET /reports/efficiency`, `/revenue-trend`, `/company-financials` | Angka sesuai data aktual | API | | |
| REPORT-03 | Kirim report via email | `POST /reports/send-email` | Email terkirim (queued), isi sesuai laporan | API | | |
| REPORT-04 | Report Schedules terjadwal | Buat schedule, cek command terjadwal jalan | Email otomatis terkirim sesuai jadwal | API | | |
| REPORT-05 | Backup SQL | `GET /system/backup/sql` | File `.sql` valid berisi INSERT semua tabel | API | | |
| REPORT-06 | Backup CSV | `GET /system/backup/csv` | File `.zip`, 1 CSV per tabel | API | | |
| REPORT-07 *(negative)* | Generate report — project tanpa data | `POST /reports/generate` untuk project tanpa task/finance sama sekali | Tetap berhasil, output kosong/nol yang wajar (bukan crash 500) | API | | |
| REPORT-08 *(negative)* | Kirim report — email invalid | `POST /reports/send-email` dengan alamat tujuan format invalid | 422 | API | | |

---

## 9. Review System

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| REVIEW-01 | Buat evaluation cycle | `POST /review/evaluations` | Tersimpan per methodology, urutan `order` benar | API | | |
| REVIEW-02 | Pertanyaan tanpa bobot | `has_weight=false` tanpa `description` | Ditolak; dengan description diterima, `weight` dipaksa 0 | API | | |
| REVIEW-03 | Pertanyaan tanpa bobot tidak minta skor | Isi form review dengan pertanyaan tanpa bobot | Tidak ada input skor untuk pertanyaan itu, dianggap otomatis terjawab | UI | | |
| REVIEW-04 | Total bobot > 100% ditolak | Tambah pertanyaan berbobot yang bikin total >100% | 422 dengan sisa bobot yang benar | API | | |
| REVIEW-05 | Submit review — validasi lengkap | Submit tanpa semua pertanyaan berbobot terisi | Ditolak sampai lengkap | API | | |
| REVIEW-06 | Trigger status akurat | Cek `trigger-status` utk task_done_percentage/mh_percentage | `current_value` vs `trigger_value` sesuai data aktual | API | | |
| REVIEW-07 | Public review link akses tanpa login | `GET /review/{token}` tanpa auth header | Berhasil (bukan endpoint terproteksi) | API | | |
| REVIEW-08 | Token expired/nonaktif ditolak | Akses token yang `is_active=false` atau lewat `expires_at` | Ditolak / `is_usable=false` | API | | |
| REVIEW-09 | Tambah email ke token existing | `PATCH /review/tokens/{id}/emails` pada token yang tadinya `client_emails=[]` | Tersimpan, auto-save saat chip ditambah/dihapus di FE | Mixed | | |
| REVIEW-10 | Preview email sebelum kirim | `GET /review/tokens/{id}/email-preview` | Subject/body ter-render dari template + placeholder tersubstitusi (`{project_name}` dst.) | API | | |
| REVIEW-11 | Override subject/body sekali kirim | `POST .../send-email` dengan `subject`/`body` custom | Email terkirim pakai override; `settings` template global TIDAK berubah | API | | |
| REVIEW-12 | Template Settings simpan & reset | `POST /settings/update` isi lalu kosongkan (reset) | Reset (string kosong) fallback ke default hardcoded | API | | |
| REVIEW-13 | "Terkirim ke User" via has_emails | Token dengan `client_emails` terisi tapi `email_sent_at` null | Dihitung TERKIRIM (bukan cuma saat benar2 dikirim) | API | | |
| REVIEW-14 | Share status per evaluasi, bukan per project | Project dengan 2 evaluasi, 1 ada link 1 tidak | `share` masing2 evaluasi independen, tidak digabung jadi 1 status project | API | | |
| REVIEW-15 | Dashboard tile hitung per review | Bandingkan total tile "Terkirim ke User"/"Link Disalin" vs jumlah evaluasi (bukan jumlah project) di seluruh sistem | Angka = jumlah REVIEW yang memenuhi kondisi, bukan jumlah PROJECT | API | | |
| REVIEW-16 | "Disalin" hanya per-browser | Copy link di browser A, cek status di browser B | Browser B tetap "Belum disalin" (localStorage tidak sinkron lintas device — ini expected, bukan bug) | UI | | |
| REVIEW-17 *(negative)* | Submit review 2x oleh user sama | `POST .../reviews` 2x untuk evaluation yang sama, user yang sama | Cek: dibolehkan (tersimpan sbg histori baru, `summary()` ambil yang `latest()`), atau ditolak — dokumentasikan | API | | |
| REVIEW-18 *(negative)* | Skor di luar rentang 1-10 | Submit `answers.*.score = 0` atau `11` | 422 | API | | |
| REVIEW-19 *(negative)* | Public token dipakai submit 2x | `POST /public/review/{token}/submit` 2x dengan token yang sama | Cek: token reusable sampai expired, atau single-use — dokumentasikan behavior aktual | API | | |
| REVIEW-20 *(negative)* | `client_emails` format tidak valid | `PATCH /review/tokens/{id}/emails` dengan email format salah (mis. `bukan-email`) | Ditolak/di-filter oleh `EmailListParser` (tidak tersimpan sbg email tidak valid) | API | | |
| REVIEW-21 *(negative)* | Kirim email — token tanpa `client_emails` | `POST .../send-email` untuk token `client_emails=[]` | 422 "Belum ada email client yang tersimpan untuk link ini." | API | | |
| REVIEW-22 *(positive)* | Override subject/body string kosong | `POST .../send-email` dengan `subject: ''`, `body: ''` | Fallback pakai template default (bukan subject/body benar2 kosong) | API | | |

---

## 10. Integration

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| INTEG-01 | List project integrasi | `GET /integration/projects` | Data sesuai project yang terhubung | API | | |
| INTEG-02 | Integration registry | `GET /integration/registry` | Daftar integrasi terdaftar akurat | API | | |
| INTEG-03 | Global Integration API key | Kelola API key di halaman Global Integration | Key ter-generate/revoke dengan benar | Mixed | | |
| INTEG-04 *(negative)* | Akses tanpa permission | Hit `/integration/*` tanpa `integrasi.read` | 403 | API | | |
| INTEG-05 *(negative)* | API key yang sudah direvoke dipakai | Panggil integrasi dengan API key yang sudah di-revoke | Ditolak | API | | |

---

## 11. System — Dashboard, Settings, Logs

| ID | Skenario | Cara Uji | Expected Result | Exec | Status | Catatan/Bukti |
|---|---|---|---|---|---|---|
| SYS-01 | Dashboard overview metrics | `GET /dashboard/overview` | Angka sesuai data aktual (project aktif, task summary, dll.) | API | | |
| SYS-02 | Update & test SMTP settings | `POST /settings/update` (SMTP fields), `POST /settings/test-smtp` | Tersimpan; test kirim email sungguhan sukses/gagal sesuai konfigurasi | API | | |
| SYS-03 | Upload/hapus logo & favicon | `POST`/`DELETE /settings/branding/logo` & `/favicon` | Ter-update, fallback ke default saat dihapus | API | | |
| SYS-04 | Activity log tercatat | Lakukan aksi penting (create/update/delete project/task/dll.) | Baris baru muncul di `activity_logs` dengan `type`/`activity`/`description` benar | API | | |
| SYS-05 | Cleanup activity log lama | `POST /activity-logs/cleanup` | Log lama terhapus sesuai kriteria | API | | |
| SYS-06 | Reset data — scope terbatas | `POST /system/reset` | Data transaksi terhapus; user/role/permission TETAP ADA | API | | |
| SYS-07 | Rate limit unknown key di settings update | `POST /settings/update` dengan key di luar `SettingKeys::UPDATABLE` | 422 "One or more settings keys are not allowed." | API | | |
| SYS-08 *(negative)* | Reset data tanpa `settings.reset` | User punya `settings.update` tapi bukan `settings.reset` — `POST /system/reset` | 403 | API | | |
| SYS-09 *(negative)* | Rate limit reset data | 4x `POST /system/reset` dalam 1 menit | Percobaan ke-4 kena 429 (limiter `3,1`) | API | | |
| SYS-10 *(negative)* | Upload logo — file bukan image | `POST /settings/branding/logo` dengan file `.pdf`/`.txt` | 422 | API | | |
| SYS-11 *(negative)* | Upload logo — ukuran > 4MB | `POST /settings/branding/logo` dengan file > 4096 KB | 422 | API | | |

---

## Ringkasan Jumlah per Modul

| Modul | Jumlah Skenario |
|---|---|
| AUTH | 28 |
| RBAC | 17 |
| Core Project | 13 |
| Task Management | 32 |
| Manhour & Team Load & MH Alert | 21 |
| Sales & Presales | 19 |
| Finance | 11 |
| Reports & Export | 8 |
| Review System | 22 |
| Integration | 5 |
| System | 11 |
| **Total** | **187** |

---

## Catatan Sebelum Eksekusi

- Semua eksekusi `API` akan pakai **data disposable** (dibuat lewat tinker/request asli, dibersihkan lagi setelahnya) — tidak menyentuh data produksi/asli yang sudah ada, sama seperti pola verifikasi di sesi-sesi sebelumnya.
- Skenario `UI`/`Mixed` bagian visualnya akan saya tandai `Perlu verifikasi manual` di kolom Catatan — hasilnya menunggu konfirmasi kamu setelah coba di browser.
- Kalau ada skenario yang menurutmu tidak relevan, kurang, atau urutan prioritasnya perlu diubah, tandai saja di sini sebelum saya mulai eksekusi.
