# Mobile App — Planning, Opsi & Task List

> Status: **DISKUSI / belum disepakati**. Dokumen ini untuk mengumpulkan keputusan + jadi checklist pertimbangan sebelum bikin plan implementasi final.
> Target: aplikasi mobile (Android + iOS) yang memakai **backend & data yang sama** dengan web (`routes/api.php`, MySQL, Sanctum). Tidak ada DB/backend terpisah.

> **Keputusan yang sudah diambil:**
> - ❌ **Push notification di-SKIP dulu** (v1 tanpa push). Notifikasi cukup lewat bell in-app + polling yang sudah ada di SPA. Lihat §7.

---

## 1. Tiga arah yang mungkin

| Arah | Isi | Effort (relatif web = 100%) | Kapan dipilih |
|---|---|---|---|
| **A. Companion native** (React Native + Expo) | Login + layar inti dibangun native dari nol | ~35–45% · 10–14 mgg | Produk mewakili brand, masuk App Store publik, butuh rasa native |
| **B. Capacitor wrap** (bungkus SPA yang ada) | Shell native + webview memuat SPA; sedikit rework responsif | ~50–60% kalau UI desktop diterima apa adanya + distribusi internal · **6–8 mgg**<br>~75–90% kalau layout inti dirapikan · 9–13 mgg | Distribusi internal, tim oke UX "cukup", mau cepat |
| **C. Native login only + sisanya webview** | Varian B; shell RN sendiri, login native, token dioper ke webview | Mirip B, sedikit lebih mahal dari shell custom | Nyaris tidak beli apa-apa vs B kalau sudah pakai Capacitor (plugin biometrik bisa gate seluruh webview) |

**Rekomendasi:** kalau distribusi internal → **B (Capacitor wrap)**. Kalau masuk store publik & jadi wajah produk → **A**.

### Kenapa "akalin webview" hematnya terbatas
Biaya terbesar mobile bukan di layar, tapi di hal yang **tetap ada** di semua arah:
- **Session single-device** (§4.1) — tetap perlu diberesin.
- **SPA belum responsif** — `ProjectBoard.jsx` (3600 baris, Kanban `max-h-70vh`, @dnd-kit drag, dialog `max-w-3xl`, tabel padat) di layar HP = sempit, scroll horizontal, tap target kecil.
- **File I/O di webview** — upload avatar/attachment, kamera, download PDF quotation/report, CSV import butuh konfigurasi khusus per platform.
- **Store review risk** — Apple guideline 4.2 ("login + webview" sering ditolak). Hilang kalau distribusi **internal / TestFlight / Play Internal / enterprise** saja.

---

## 1b. Perbandingan keuntungan & kekurangan

### Ringkasan matriks

| Dimensi | A. Companion native | B. Capacitor wrap | C. Native login + webview |
|---|---|---|---|
| Effort vs web | ~35–45% | ~40–50% (UI apa adanya) / ~65–80% (dirapikan) | mirip B + sedikit |
| Durasi (1–2 dev) | 10–14 mgg | **6–8 mgg** / 9–12 mgg | 7–9 mgg |
| Rasa native | Penuh | Rendah ("web di app") | Login native, sisanya rendah |
| Basis kode UI | 2 (web + mobile) | **1** (SPA) | 1 (SPA) |
| Risiko App Store 4.2 (publik) | Tidak ada | Ada (aman kalau internal) | Ada |
| Tambah offline nanti | Mudah | Sulit | Sulit |
| Tambah push nanti | Mudah | Sedang (perlu jembatan) | Sedang |
| Skill baru di tim | RN/Expo | Minim (tetap React/Vite) | RN |
| Rilis update UI | Store / OTA JS | SPA deploy (D3=a) atau rilis app (D3=b) | SPA deploy / rilis app |
| Keamanan simpan token | Keychain/Keystore | localStorage webview (bisa di-upgrade plugin) | Keychain/Keystore |

### A. Companion native (React Native + Expo)

**Keuntungan**
- UX benar-benar native: gesture, scroll momentum, keyboard, transisi, tombol back.
- Bebas risiko App Store guideline 4.2.
- Offline & push (kalau nanti dibuka) jauh lebih mudah ditambah — arsitektur sudah siap.
- Performa halus, tak ada lag/reflow webview, tak menyeret bundle CSS/JS desktop.
- Kontrol penuh atas layout mobile — tidak terikat SPA desktop yang padat.
- Bisa share tipe/logika via package (tim sudah React/TS).
- Kualitas jangka panjang: kode app bersih.

**Kekurangan**
- Effort & durasi terbesar (10–14 minggu).
- Bangun ulang semua layar + design system mobile dari nol (shadcn/Radix tak kepakai).
- **Dua basis kode UI** — tiap perubahan fitur disentuh 2×, gampang drift.
- Butuh skill RN/Expo, CI mobile (EAS), sertifikat, provisioning.
- Fitur di luar scope companion (finance/sales/review/dll) **tidak ada** sampai dibangun.

### B. Capacitor wrap (bungkus SPA yang ada)

**Keuntungan**
- Tercepat (~6–8 minggu), **satu basis kode UI**.
- Reuse 100% SPA — semua fitur ikut walau tak difokuskan (finance, review, dll tetap bisa dibuka).
- Perubahan fitur cukup di SPA, mobile ikut otomatis.
- Ekosistem plugin matang: biometrik, kamera, filesystem, splash, status bar.
- Nyaris tanpa skill baru (tetap React/Vite). Bisa jadi PWA sekalian.

**Kekurangan**
- Terasa "web di dalam app": scroll, keyboard resize, back button, tanpa gesture native.
- SPA belum responsif — `ProjectBoard.jsx` dll sempit di HP, **tetap perlu rework alur inti** (§4.C).
- @dnd-kit drag tak reliable di touch → mekanisme ubah status harus diganti.
- File upload/download & kamera di webview butuh plumbing plugin per platform.
- Risiko App Store 4.2 kalau distribusi publik (aman kalau internal).
- WKWebView (iOS) kadang beda perilaku dari Safari — wajib tes device fisik.
- Debug lintas layer (shell ↔ webview) lebih ribet. Bundle desktop penuh ikut ke HP (first load berat).

#### B — sub-mode D3=a: `server.url` remote (webview menunjuk situs live)
- **+** Setup paling minim, tak ubah pipeline build. API same-origin → tak perlu CORS. Update UI instan tanpa rilis app.
- **−** Wajib online selalu, tak ada shell/splash offline berarti. Tiap buka = load dari server. **Paling rawan ditolak App Store publik** ("cuma pembungkus situs"). App tak bisa dibuka kalau server down.

#### B — sub-mode D3=b: bundle asset SPA ke dalam app
- **+** Ada splash + shell, aset UI lokal → buka app lebih cepat. Kontrol versi UI per rilis (bisa diuji sebelum lepas). Argumen lebih kuat di review store.
- **−** Perlu `config/cors.php` (allow `capacitor://localhost`, `https://localhost`, dll) + `VITE_API_BASE_URL` di SPA. Tiap perubahan UI harus build + rilis app (atau pakai live-update Capacitor). Pastikan Sanctum Bearer jalan cross-origin (harusnya ya — token, bukan cookie).

### C. Native login only + webview (shell React Native custom)

**Keuntungan**
- Layar login terasa native; token di Keychain/Keystore (lebih aman dari localStorage webview).
- Splash & gate biometrik dikontrol native.
- Sisanya tetap reuse SPA — hemat seperti B.

**Kekurangan**
- Bangun & rawat shell RN sendiri (webview bridge, `postMessage`, deep link, file I/O) — **lebih banyak kode native dari Capacitor untuk hasil setara**.
- Butuh skill RN.
- Token handoff (inject ke `localStorage` webview) rapuh: harus sinkron logout/expired antara native ↔ webview.
- Semua kekurangan webview di B tetap berlaku (responsif, drag, file, risiko 4.2).
- Praktis tak lebih unggul dari B kecuali benar-benar butuh login native + secure storage sejak v1.

---

## 2. Keputusan yang masih terbuka

| # | Pertanyaan | Opsi | Default usulan |
|---|---|---|---|
| D1 | Arah | A / B / C (lihat §1) | B kalau internal |
| D2 | Scope v1 | Companion (my tasks, board status, manhour, notif read) vs parity penuh | Companion |
| D3 | Capacitor load mode (kalau B) | (a) `server.url` → webview remote ke situs live (b) bundle asset SPA + API cross-origin | (a) untuk mulai; (b) kalau butuh splash/offline shell & kontrol versi |
| D4 | Offline | Online-only v1 vs cache+queue | Online-only |
| D5 | Session | Multi-device token vs terima "login app menendang sesi web" | Multi-device token |
| D6 | Distribusi | Store publik vs internal (TestFlight / Play Internal / APK / enterprise) | — (butuh jawaban) |
| D7 | Dokumen client-facing (quotation/report PDF) dibuka di mobile? | ya / tidak | — |
| D8 | Biometrik / PIN lokal untuk buka app | ya / tidak | ya (plugin, murah) |
| D9 | Min OS | iOS __ / Android __ | iOS 15+, Android 8+ |
| D10 | Bahasa app | ikut migrasi English / bilingual | ikut English |
| D11 | Server staging terpisah? | ada / tidak | — |
| D12 | Pemilik akun Apple ($99/th) & Google Play ($25) + sertifikat | — | — |
| D13 | Dukungan tablet/iPad | ya / phone saja | phone saja |

---

## 3. Kandidat scope v1 (companion)

**Masuk:**
- Login (+ biometrik/PIN lokal), handle force-change-password & token expired
- My Tasks / task yang di-assign ke saya — list + ubah status
- Task detail: notes + @mention, subtask (read), history (read)
- Notifikasi — list bell in-app + polling (tanpa push)
- Manhour logging (quick entry per hari/role)
- Project Board per project (read; ubah status via tombol/long-press, **bukan** drag)
- Profile + Notification Center
- Announcement (tampil saat login, sama seperti web)
- Review submission (opsional — sudah ada link publik token-based)

**Tidak masuk v1:**
- Finance Monitoring, Finance/Realization Report, Reports/analytics
- Sales Pipeline, Presales, Quotation generator, Master data
- Access Control / Roles / Modules / Menu Items / System Logs / Settings / Backup
- Gantt chart, Team Load heatmap (bisa read-only nanti)

---

## 4. TASK LIST

Legenda: `[ ]` belum · `(A)` khusus arah native · `(B/C)` khusus arah webview · tanpa tag = semua arah.

### A. Persiapan & keputusan
- [ ] Kunci jawaban D1–D13 di atas
- [ ] Tentukan pemilik akun Apple Developer & Google Play, siapkan sertifikat/keystore
- [ ] Tentukan URL API per environment (dev / staging / prod) + apakah ada server staging (D11)
- [ ] Tentukan channel distribusi (D6) — ini mengubah risiko store review & kebutuhan akun

### B. Backend — enabler minimum (tanpa push)
- [ ] **Multi-device token** (D5): ubah `AuthController::login()` supaya tidak `tokens()->delete()` tanpa syarat; token dinamai per device (`createToken($deviceLabel)`); tambah endpoint list & revoke device — `GET /devices`, `DELETE /devices/{id}`
- [ ] Tetapkan expiry token mobile lebih panjang (atau refresh token) — sekarang default 1440 mnt + middleware `token.lifetime`
- [ ] Pastikan flow `password_expired` / `force_logout` (sudah ada di `serializeUser()`) di-handle app
- [ ] **Endpoint ringkas untuk mobile**: `GET /my-tasks` (task assigned ke user, paginate/cursor) — hindari `GET /tasks?project_id=` yang kirim semua task tanpa paginate
- [ ] (Opsional) Endpoint **bootstrap** gabungan untuk layar board (members + balance + tasks + quotas) supaya tidak 6–7 request paralel di seluler
- [ ] **Paginate** endpoint list yang belum: `/tasks`, dsb.
- [ ] **CORS** (khusus D3=b / arah B bundle asset): publish `config/cors.php`, allow origin `capacitor://localhost`, `http://localhost`, `https://localhost`, `ionic://localhost`; `paths` = `api/*`; `supports_credentials` = false (Bearer, bukan cookie)
- [ ] **`GET /health` + `GET /version`** dengan `min_supported_app_version` untuk force-update check
- [ ] **Standarkan amplop error** (`code`, `message`, `errors`) — sekarang 429 punya body custom, sisanya default Laravel
- [ ] (Opsional) **API versioning** `/api/v1/...` atau minimal freeze kontrak endpoint yang dipakai mobile
- [ ] (Opsional) **Spec OpenAPI** (Scribe / Scramble) — berguna juga buat web
- [ ] **File sensitif** (D7): kalau PDF quotation/report dibuka di mobile, ganti `/storage/...` publik jadi route ber-auth atau signed URL
- [ ] (Opsional, tanpa push tetap berguna untuk universal link) `public/.well-known/apple-app-site-association` + `assetlinks.json`

### C. SPA — penyesuaian agar layak di HP
- [ ] **Base URL config** (khusus D3=b): SPA sekarang same-origin; tambah `VITE_API_BASE_URL` + inject di `services/api.js` & `AuthContext.jsx`
- [ ] Deteksi "mode mobile/webview" (user agent / query flag) untuk sembunyikan elemen desktop-only bila perlu
- [ ] **Responsif alur inti** (companion): My Tasks list, Task detail + notes + mention picker, Manhour form, Board (kolom bertumpuk vertikal di HP), Profile, Notification Center — target tap 44px, tanpa scroll horizontal
- [ ] **Board tanpa drag di touch**: ganti pindah status via tombol / menu long-press (drag @dnd-kit tidak reliable di HP)
- [ ] Sembunyikan / gate modul non-scope (finance, sales, presales, reports, RBAC, settings) di sidebar saat mode mobile
- [ ] Viewport meta + safe-area (notch) handling di `index.html`
- [ ] Pull-to-refresh & state loading/empty/error yang ramah HP
- [ ] Cek semua `window.confirm` / `alert()` — masih ok di webview, tapi pertimbangkan komponen in-app
- [ ] Uji upload (avatar, attachment) & download (PDF) dari dalam webview

### D. Shell — arah B (Capacitor)
- [ ] Init project Capacitor, tambah platform iOS + Android
- [ ] Konfigurasi load mode (D3): `server.url` remote **atau** bundle hasil `npm run build`
- [ ] Simpan token: mulai dari `localStorage` webview (persisten, sandbox per app); upgrade ke secure-storage plugin bila perlu
- [ ] Plugin biometrik / PIN gate seluruh webview (D8)
- [ ] Splash screen + app icon + nama app
- [ ] Handle tombol back Android, keyboard resize, status bar style (tema gelap)
- [ ] File plugin: input file / kamera untuk upload, penanganan download PDF
- [ ] Deep link handler: buka URL app → webview `router.navigate` ke path yang sesuai
- [ ] Deteksi offline → tampilkan layar "tidak ada koneksi" (v1 online-only)

### D'. Shell — arah C (Native login only, kalau bukan Capacitor)
- [ ] Shell React Native + `react-native-webview`
- [ ] Layar login native → `POST /login` → simpan token di Keychain/Keystore
- [ ] Inject token ke `localStorage` webview via `injectedJavaScriptBeforeContentLoaded` sebelum load
- [ ] Bridge `postMessage` untuk logout / token expired / deep link dari webview ke native
- [ ] Sisanya sama seperti bagian D (file I/O, back button, offline, biometrik)

### E. Skeleton & layar — arah A (Companion native), kalau dipilih
- [ ] Setup Expo, env config, CI (EAS Build)
- [ ] API client + tipe (share package atau generate dari OpenAPI) + interceptor auth (Bearer, 401, refresh)
- [ ] Data layer: TanStack Query (cache, retry, background refetch)
- [ ] Design system mobile (shadcn/Radix tidak bisa dipakai) — komponen native, token warna `#000040` / `#151b28` / `#1e2532` / accent, dark mode
- [ ] Navigasi: stack + tab (My Tasks / Board / Notifications / Profile) + deep link
- [ ] Auth flow: login, biometrik (`expo-local-authentication`), secure storage, force-change-password, logout-all
- [ ] Layar: My Tasks + status, Task detail + notes/mention, Notifikasi (list + polling), Manhour form, Board read + status changer, Profile, Notification Center, Announcement
- [ ] Layar review submission (opsional)

### F. Rilis & operasional
- [ ] Crash & analytics (Sentry / Firebase Crashlytics)
- [ ] Versioning app + endpoint force-update terpakai
- [ ] Build & distribusi: TestFlight + Play Internal testing (atau APK internal)
- [ ] Store assets: ikon, splash, screenshot, deskripsi, **privacy policy URL**
- [ ] Privacy: App Store nutrition labels + Play Data Safety (data yang dikumpulkan: token auth, dsb.)
- [ ] QA 2 platform (device fisik iOS + Android), minimal alur companion end-to-end
- [ ] Update `DEPLOY-PRODUCTION.md` bila ada env/CORS baru

---

## 5. Rekap effort (tanpa push)

| Arah | Effort vs web | Durasi (1–2 dev) |
|---|---|---|
| A. Companion native | ~35–45% | 10–14 minggu |
| B. Capacitor, UI desktop diterima, distribusi internal | ~40–50% | **6–8 minggu** |
| B. Capacitor, layout inti dirapikan | ~65–80% | 9–12 minggu |
| C. Native login + webview (shell custom) | mirip B + sedikit | 7–9 minggu |

Push di-skip memangkas ~5–10% dari semua angka (hilang: `device_tokens`, channel FCM/APNs, kredensial, handler native, sebagian deep-link).

---

## 6. Bahan pertimbangan / trade-off

- **B lebih cepat, tapi**: hasil terasa "web di dalam app", scroll/keyboard/back tidak native, tetap harus benahi responsif alur inti, dan risiko App Store 4.2 kalau publik.
- **A lebih lama, tapi**: UX native, offline & push (nanti) lebih mudah ditambah, bebas risiko 4.2, kode app bersih.
- **Session single-device (D5)** adalah pekerjaan yang tetap harus dilakukan apa pun arahnya kalau web & mobile mau login bersamaan.
- **Tanpa staging (D11)** semua uji integrasi menembak prod — berisiko untuk perubahan auth/token.
- **Capacitor `server.url` remote (D3=a)** = paling cepat mulai, update instan tanpa store, tapi wajib online dan paling rawan ditolak store publik.

---

## 7. Sengaja DITUNDA / tidak di v1

- **Push notification** (FCM/APNs, `device_tokens`, channel di 4 Notification class, kredensial) — di-skip atas keputusan. Notifikasi cukup bell in-app + polling SPA yang sudah ada.
- **Realtime / websocket** (Laravel Reverb / Pusher) — tetap polling.
- **Offline / sync** (`?since=`, ETag, idempotency key, mutation queue).
- **Rebuild native penuh semua modul** (finance, sales, presales, reports, RBAC, Gantt, Team Load).
- **Tablet / iPad layout** (D13 = phone saja).
