<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'nickname',
        'avatar_path',
        'email',
        'password',
        'role_id',
        'role',
        'phone_number',
        'status',
        'task_email_notifications_enabled',
        'timezone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'password_changed_at' => 'datetime',
            'task_email_notifications_enabled' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (!$user->password_changed_at) {
                $user->password_changed_at = now();
            }
        });
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function passwordHistories()
    {
        return $this->hasMany(PasswordHistory::class);
    }

    /** Password rotation policy: must be changed at least every 6 months. */
    public function isPasswordExpired(): bool
    {
        if (!$this->password_changed_at) {
            return true;
        }
        return $this->password_changed_at->lt(now()->subMonths(6));
    }

    public function hasPermission($slug)
    {
        if ($this->is_superuser) {
            return true;
        }
        $roleModel = $this->role()->first();
        if (!$roleModel) {
            return false;
        }
        return $roleModel->permissions()
            ->where('slug', $slug)
            ->whereHas('module', fn ($q) => $q->where('is_active', true))
            ->exists();
    }
}
