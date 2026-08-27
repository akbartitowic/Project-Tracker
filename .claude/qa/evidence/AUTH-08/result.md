# AUTH-08 — GET /me akurat

**Request:** `GET /api/me` dengan token valid → `200`

Data sesuai user yang login (id, name, email, role, `password_expired: false`), termasuk
`role_permissions` yang sudah benar ter-scope ke 4 permission role Freelance
(`project_board.read`, `project_board.update`, `profile.read`, `profile.update`).

**Observasi (bukan bug, dikonfirmasi by design):** field `menu_items` di response berisi SEMUA
menu sistem untuk semua user, tidak difilter per-role di backend — dikonfirmasi lewat komentar kode
eksplisit di `AuthController.php`: *"Same list for every user — visibility is still gated by
role_permissions above; this is just sidebar presentation metadata."* Filtering visibilitas
sungguhan terjadi di frontend (`hasPermission()`) dan di middleware `permission:` untuk endpoint API
— jadi tidak ada kebocoran data/akses, cuma payload menu mentahnya memang tidak dipangkas.
