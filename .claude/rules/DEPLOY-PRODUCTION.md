# Deploy Production — Project Tracker

Salin-tempel blok di bawah. Ganti placeholder `<<<...>>>` sebelum jalan.

---

## 1) `.env` production

Buat file `.env` di server (atau salin dari `.env.production.example`):

```env
APP_NAME="Project Tracker"
APP_ENV=production
APP_KEY=<<<KOSONGKAN_LALU_JALANKAN_php_artisan_key:generate>>>
APP_DEBUG=false
APP_URL=https://<<<DOMAIN_ANDA.com>>>

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=warning

# --- Database (pilih satu, hapus/comment yang tidak dipakai) ---

# MySQL / MariaDB (umum di production)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<<<NAMA_DATABASE>>>
DB_USERNAME=<<<DB_USER>>>
DB_PASSWORD=<<<DB_PASSWORD>>>

# PostgreSQL (alternatif)
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=<<<NAMA_DATABASE>>>
# DB_USERNAME=<<<DB_USER>>>
# DB_PASSWORD=<<<DB_PASSWORD>>>

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=<<<SMTP_HOST>>>
MAIL_PORT=587
MAIL_USERNAME=<<<SMTP_USER>>>
MAIL_PASSWORD=<<<SMTP_PASSWORD>>>
MAIL_FROM_ADDRESS="<<<EMAIL_FROM>>>"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

VITE_APP_NAME="${APP_NAME}"

ALLOW_PUBLIC_SIGNUP=false
SANCTUM_TOKEN_EXPIRATION_MINUTES=720
```

**Penting**

- `APP_URL` harus sama persis dengan URL browser (https, tanpa slash di akhir).
- `APP_DEBUG=false` wajib di production.
- Logo company: butuh `php artisan storage:link` + folder `storage/app/public` tidak boleh terhapus saat deploy.

---

## 2) Deploy script (satu blok)

```bash
cd /var/www/<<<FOLDER_APLIKASI>>>

git pull origin main

composer install --no-dev --optimize-autoloader

php artisan migrate --force

php artisan storage:link --force

npm ci
npm run build

php artisan config:cache
php artisan route:cache
php artisan view:cache

# Opsional — jika pakai PHP-FPM:
# sudo systemctl reload php8.2-fpm

# Opsional — jika pakai queue worker:
# php artisan queue:restart
```

**Install pertama** (belum ada `.env` / `APP_KEY`):

```bash
cd /var/www/<<<FOLDER_APLIKASI>>>
cp .env.production.example .env
nano .env   # isi DB, APP_URL, dll.

composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan storage:link --force
npm ci && npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 3) Permission folder (sekali, jika error write storage)

```bash
cd /var/www/<<<FOLDER_APLIKASI>>>
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

(Ganti `www-data` dengan user PHP/web server Anda.)

---

## 4) Cek cepat setelah deploy

```bash
php artisan migrate:status
ls -la public/storage
curl -I https://<<<DOMAIN_ANDA.com>>>/storage/
```

Browser:

1. Login
2. Company logo tampil
3. Finance Monitoring / Finance Report / Sales quotation
4. Menu Integrasi (role Admin otomatis punya `integrasi.read`)

---

## 5) Role permission baru

Migration menambah permission berikut:

| Permission | Role otomatis |
|------------|----------------|
| `integrasi.read` | Admin |
| `load.read` (menu **Load**) | Admin, Project Manager |
| Sync Freelance / Board Member | Freelance: board read+update saja; Board Member: + board create |

Role lain (Developer, QA, dll.): aktifkan di **Access Control** → modul **Load** jika perlu.

Repository: https://github.com/akbartitowic/Project-Tracker.git — branch `main`

---

## 6) Aturan migration baru (developer)

Saat menulis migration baru di production: **FK dan index wajib nama pendek custom** (hindari blocking / nama terlalu panjang).

- Panduan: `database/MIGRATION_CONVENTIONS.md`
- Helper: `App\Support\MigrationNames` → `MigrationNames::fk('pa', 'user')`, `MigrationNames::idx('pa', 'paid_at')`
- Cursor rule: `.cursor/rules/database-migrations.mdc`
