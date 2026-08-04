<?php

namespace App\Support;

class EmailListParser
{
    /**
     * Normalizes a raw email list (array or comma-separated string) into a
     * deduped (case-insensitive), trimmed, validated list of email addresses.
     *
     * @param array<int, string>|string|null $raw
     * @return array<int, string>
     */
    public static function parse(array|string|null $raw): array
    {
        if (!$raw) {
            return [];
        }

        $list = is_array($raw) ? $raw : explode(',', $raw);
        $list = array_values(array_filter(array_map('trim', $list)));
        $list = array_values(array_unique(array_map('strtolower', $list)));

        return array_values(array_filter($list, fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL) !== false));
    }
}
