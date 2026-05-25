<?php

namespace App\Support;

/**
 * Short constraint/index names for migrations (MySQL 64-char identifier limit).
 *
 * @see database/MIGRATION_CONVENTIONS.md
 */
final class MigrationNames
{
    public static function fk(string $tableAbbr, string $refAbbr): string
    {
        return self::limit("{$tableAbbr}_{$refAbbr}_fk");
    }

    public static function idx(string $tableAbbr, string $purpose): string
    {
        return self::limit("{$tableAbbr}_{$purpose}_idx");
    }

    public static function uq(string $tableAbbr, string $purpose): string
    {
        return self::limit("{$tableAbbr}_{$purpose}_uq");
    }

    private static function limit(string $name): string
    {
        return strlen($name) > 64 ? substr($name, 0, 64) : $name;
    }
}
