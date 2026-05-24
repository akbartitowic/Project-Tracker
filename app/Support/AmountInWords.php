<?php

namespace App\Support;

class AmountInWords
{
    private const ONES = [
        '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
        'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
        'seventeen', 'eighteen', 'nineteen',
    ];

    private const TENS = [
        '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
    ];

    private const SCALES = [
        1_000_000_000_000 => 'trillion',
        1_000_000_000 => 'billion',
        1_000_000 => 'million',
        1_000 => 'thousand',
    ];

    public static function idrToEnglish(float|int|string $amount): string
    {
        $n = (int) round((float) $amount);
        if ($n < 0) {
            $n = abs($n);
        }
        if ($n === 0) {
            return 'Zero rupiahs.';
        }

        $parts = [];
        $remainder = $n;
        foreach (self::SCALES as $value => $label) {
            if ($remainder >= $value) {
                $chunk = (int) floor($remainder / $value);
                $remainder %= $value;
                $parts[] = self::chunkToWords($chunk) . ' ' . $label;
            }
        }
        if ($remainder > 0) {
            $parts[] = self::chunkToWords($remainder);
        }

        $text = trim(implode(' ', $parts));
        $text = ucfirst($text) . ' rupiahs.';

        return $text;
    }

    private static function chunkToWords(int $n): string
    {
        if ($n === 0) {
            return '';
        }
        if ($n < 20) {
            return self::ONES[$n];
        }
        if ($n < 100) {
            $tens = (int) floor($n / 10);
            $ones = $n % 10;

            return trim(self::TENS[$tens] . ($ones ? ' ' . self::ONES[$ones] : ''));
        }

        $hundreds = (int) floor($n / 100);
        $rest = $n % 100;
        $hundredPart = self::ONES[$hundreds] . ' hundred';
        if ($rest === 0) {
            return $hundredPart;
        }

        return $hundredPart . ' ' . self::chunkToWords($rest);
    }
}
