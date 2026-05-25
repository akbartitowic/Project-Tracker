#!/usr/bin/env bash
# Deploy Project Tracker — production
# Usage: ./scripts/deploy-production.sh
# Run from project root. Requires: git, composer, php, npm

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pull latest code"
git pull origin main

echo "==> Composer"
composer install --no-dev --optimize-autoloader

echo "==> Migrate"
php artisan migrate --force

echo "==> Storage link (company logos, quotations)"
php artisan storage:link --force

echo "==> Frontend build"
npm ci
npm run build

echo "==> Cache"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Done. Reload PHP-FPM / queue if you use them."
