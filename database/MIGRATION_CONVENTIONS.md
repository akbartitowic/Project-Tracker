# Migration conventions (production)

MySQL identifier limit: **64 characters**. Long auto-generated Laravel names (`project_allocations_user_id_foreign`) can cause migration failures or **blocking too long** on production.

**Rule:** every new FK, unique, and composite index must use a **short custom name**.

Helper: `App\Support\MigrationNames`

---

## Naming pattern

| Type | Pattern | Example |
|------|---------|---------|
| Foreign key | `{tbl}_{ref}_fk` | `pa_user_fk` |
| Index | `{tbl}_{purpose}_idx` | `sp_closed_at_idx` |
| Unique | `{tbl}_{purpose}_uq` | `spm_pitch_cat_uq` |

Keep total length **&lt; 48 chars** when possible.

---

## Table abbreviations (use in new migrations)

| Table | Abbr |
|-------|------|
| project_allocations | `pa` |
| projects | `pr` |
| tasks | `tk` |
| manhours | `mh` |
| users | `us` |
| companies | `co` |
| presales | `ps` |
| sales_pitches | `sp` |
| sales_category_projects | `scp` |
| sales_pitch_category_project (pivot) | `spm` |
| finance_categories | `fc` |
| financial_records | `fr` |
| project_members | `pm` |
| project_roles | `prole` |
| project_role_quotas | `prq` |
| activity_logs | `al` |
| permissions / roles pivot | `rp`, `rperm` |
| project_favorites | `pf` |

Add a new row here when you introduce a new table.

---

## Examples

### Add FK column

```php
use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('category_id');
            $table->foreign('user_id', MigrationNames::fk('pa', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('pa', 'user'));
            $table->dropColumn('user_id');
        });
    }
};
```

### Index only (no FK)

```php
$table->index('paid_at', MigrationNames::idx('pa', 'paid_at'));
// down:
$table->dropIndex(MigrationNames::idx('pa', 'paid_at'));
```

### Composite index

```php
$table->index(['project_id', 'created_at'], MigrationNames::idx('pa', 'proj_created'));
```

### Unique pivot

```php
$table->unique(['sales_pitch_id', 'sales_category_project_id'], MigrationNames::uq('spm', 'pitch_cat'));
```

---

## Production deploy

- Run migrations in maintenance window if altering large tables.
- Prefer **small migrations** over one migration with many FKs/indexes.
- After deploy: `php artisan migrate --force` (see `DEPLOY-PRODUCTION.md`).

---

## Existing migrations

Older files may still use `constrained()` without custom names. **Do not rename** constraints on production unless you have a planned DDL window; apply this rule to **new** migrations only.
