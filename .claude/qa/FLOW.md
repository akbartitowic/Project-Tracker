# QA Testing Flow — HubTask

Dokumen kesepakatan proses testing, ditulis SEBELUM eksekusi batch pertama dimulai.
Ubah/coret bagian yang tidak disetujui sebelum eksekusi jalan.

## 1. Sumber skenario

Semua skenario berasal dari `.claude/qa/TEST_PLAN.md` (187 skenario, 11 modul, campuran
`*(positive)*`/`*(negative)*`). TEST_PLAN.md **tidak dipecah filenya** — tetap 1 file utuh
sebagai master list, tapi kolom **Status** dan **Catatan/Bukti** di dalamnya di-update
tiap kali sebuah batch selesai dieksekusi, jadi file itu selalu jadi dashboard status
paling terkini (bukan cuma daftar rencana).

## 2. Pembagian batch

**Maksimal 10 skenario per batch**, dan batch **tidak memotong satu modul jadi 2 batch
kalau sisanya bisa habis** — begitu suatu modul selesai, batch berikutnya mulai dari modul
baru (jadi ukuran batch bisa <10 di ujung tiap modul; total jadi 25 batch, bukan 19,
demi laporan per batch yang fokus 1 area saja, tidak nyampur 2 modul berbeda di 1 laporan).
Kalau kamu lebih suka batch rata 10 tanpa peduli potong modul (19 batch, lebih efisien
tapi laporannya bisa campur 2 modul), bilang saja — gampang diubah sebelum mulai.

| Batch | Modul | Range ID | Jumlah |
|---|---|---|---|
| 01 | AUTH | AUTH-01 – AUTH-10 | 10 |
| 02 | AUTH | AUTH-11 – AUTH-20 | 10 |
| 03 | AUTH | AUTH-21 – AUTH-28 | 8 |
| 04 | RBAC | RBAC-01 – RBAC-10 | 10 |
| 05 | RBAC | RBAC-11 – RBAC-17 | 7 |
| 06 | Core Project | PROJ-01 – PROJ-10 | 10 |
| 07 | Core Project | PROJ-11 – PROJ-13 | 3 |
| 08 | Task Management | TASK-01 – TASK-10 | 10 |
| 09 | Task Management | TASK-11 – TASK-20 | 10 |
| 10 | Task Management | TASK-21 – TASK-30 | 10 |
| 11 | Task Management | TASK-31 – TASK-32 | 2 |
| 12 | Manhour & MH Alert | MH-01 – MH-10 | 10 |
| 13 | Manhour & MH Alert | MH-11 – MH-20 | 10 |
| 14 | Manhour & MH Alert | MH-21 | 1 |
| 15 | Sales | SALES-01 – SALES-10 | 10 |
| 16 | Presales | PRESALES-01 – PRESALES-09 | 9 |
| 17 | Finance | FIN-01 – FIN-10 | 10 |
| 18 | Finance | FIN-11 | 1 |
| 19 | Reports & Export | REPORT-01 – REPORT-08 | 8 |
| 20 | Review System | REVIEW-01 – REVIEW-10 | 10 |
| 21 | Review System | REVIEW-11 – REVIEW-20 | 10 |
| 22 | Review System | REVIEW-21 – REVIEW-22 | 2 |
| 23 | Integration | INTEG-01 – INTEG-05 | 5 |
| 24 | System | SYS-01 – SYS-10 | 10 |
| 25 | System | SYS-11 | 1 |

## 3. Alur kerja per batch

1. **Eksekusi.**
   - Skenario `Exec=API`: saya jalankan langsung — request ke endpoint asli / `tinker`,
     pakai **data disposable** (dibuat lalu dibersihkan lagi setelah selesai, tidak
     menyentuh data asli), verifikasi dari response/DB state nyata.
   - Skenario `Exec=UI`: saya tulis langkah persis yang perlu kamu klik + apa yang harus
     dicek, kamu jalankan di browser dan kirim hasil + screenshot.
   - Skenario `Exec=Mixed`: saya kerjakan bagian API/data-nya duluan, lalu kasih daftar
     langkah UI yang tersisa untuk kamu verifikasi manual.
2. **Catat hasil.** Setelah semua skenario di batch itu selesai (dari saya maupun dari
   kamu), saya buat `results/BATCH-XX.md` berisi, per skenario: langkah aktual yang
   dijalankan, output/response aktual, status, dan link ke evidence-nya.
3. **Update TEST_PLAN.md.** Kolom **Status** + **Catatan/Bukti** untuk skenario2 di batch
   itu di-update di `TEST_PLAN.md` (isinya ringkas — detail lengkapnya tetap di file
   `results/BATCH-XX.md`, TEST_PLAN.md cuma nunjuk ke situ).
4. **Simpan evidence** ke `evidence/{SCENARIO-ID}/` (lihat §5).
5. **Lapor ringkasan batch** ke kamu (mis. "Batch 01: 8 Passed, 1 Bug, 1 Need Adjustment")
   sebelum lanjut ke batch berikutnya.

## 4. Status & keputusan follow-up

Legend status tetap seperti di TEST_PLAN.md: `Passed` / `Bug` / `Reopen` /
`Need Adjustment` / `Suggestion Adjustment`. Kalau ketemu `Bug` di suatu batch, saya
**laporkan dulu**, tidak langsung saya perbaiki sendiri di tengah proses testing —
biar temuan testing dan perbaikan kode tetap 2 langkah terpisah yang kamu approve
masing-masing (perbaikan bisa dikerjakan belakangan setelah 1 batch/keseluruhan
regression selesai dipetakan, supaya tidak mengubah kode yang sedang diuji di tengah jalan).

## 5. Struktur folder `.claude/qa/`

```
.claude/qa/
  FLOW.md                   <- dokumen ini
  TEST_PLAN.md              <- master list 187 skenario, Status selalu ter-update
  results/
    BATCH-01.md              <- detail eksekusi + hasil per skenario batch 01
    BATCH-02.md
    ...
  evidence/
    AUTH-01/                 <- evidence skenario AUTH-01 (dibuat saat batch-nya jalan)
    TASK-03/
    ...
```

Folder `evidence/{ID}/` dibuat on-demand pas skenario itu dieksekusi (bukan di-pre-create
semua 187 folder kosong dari awal).

## 6. Konvensi evidence

- Skenario `API`: saya simpan `evidence/{ID}/result.md` — isinya request/response nyata
  atau output `tinker` yang jadi bukti (redacted kalau ada data sensitif).
- Skenario `UI`/`Mixed`: kamu simpan screenshot ke `evidence/{ID}/` (nama file bebas,
  misal `01.png`, `02.png`) — saya link dari `results/BATCH-XX.md` dan dari kolom
  Catatan/Bukti di TEST_PLAN.md.

## 7. Disepakati

- **Lanjut antar batch:** berhenti & lapor ringkasan setelah **tiap** batch selesai
  (bukan cuma yang ada Bug) — tunggu konfirmasi lanjut sebelum mulai batch berikutnya.
