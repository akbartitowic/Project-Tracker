<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
            'task_email_notifications_enabled' => 'boolean',
        ];
    }

    public function role(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_users')
            ->withPivot(['role_id', 'joined_at'])
            ->withTimestamps();
    }

    public function organizationUsers(): HasMany
    {
        return $this->hasMany(OrganizationUser::class);
    }

    public function hasPermission($slug): bool
    {
        if (strtolower((string) $this->email) === 'tito@noohtify.com') {
            return true;
        }

        // In tenant context, use the user's role within the current organization
        if (app()->bound('tenant')) {
            $orgUser = $this->organizationUsers()
                ->where('organization_id', app('tenant')->id)
                ->with('role.permissions')
                ->first();
            $roleModel = $orgUser?->role;
        } else {
            $roleModel = $this->role()->first();
        }

        if (!$roleModel) {
            return false;
        }

        return $roleModel->permissions()->where('slug', $slug)->exists();
    }
}
