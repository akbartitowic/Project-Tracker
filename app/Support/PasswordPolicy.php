<?php

namespace App\Support;

use App\Models\PasswordHistory;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Password rotation policy: 6-month mandatory expiry (see User::isPasswordExpired())
 * plus reuse blocking against the last N passwords (current one included).
 */
class PasswordPolicy
{
    public const HISTORY_LIMIT = 3;

    /** @throws ValidationException if $plainPassword matches any of the last HISTORY_LIMIT passwords. */
    public static function assertNotReused(User $user, string $plainPassword): void
    {
        $candidates = array_filter([$user->password]);

        $previousHashes = PasswordHistory::where('user_id', $user->id)
            ->latest('id')
            ->limit(self::HISTORY_LIMIT - 1)
            ->pluck('password_hash');

        foreach ([...$candidates, ...$previousHashes] as $hash) {
            if (Hash::check($plainPassword, $hash)) {
                throw ValidationException::withMessages([
                    'password' => ['Password baru tidak boleh sama dengan ' . self::HISTORY_LIMIT . ' password terakhir yang pernah digunakan.'],
                ]);
            }
        }
    }

    /** Validates reuse, archives the outgoing password, and applies the new one. */
    public static function applyChange(User $user, string $plainPassword): void
    {
        self::assertNotReused($user, $plainPassword);

        PasswordHistory::create([
            'user_id' => $user->id,
            'password_hash' => $user->password,
        ]);

        $user->password = Hash::make($plainPassword);
        $user->password_changed_at = now();
        $user->save();
    }
}
