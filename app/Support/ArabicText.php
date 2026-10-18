<?php

namespace App\Support;

/**
 * Normalises Arabic and Kurdish (Arabic-script) text so searches match
 * regardless of diacritics, tatweel and letter variants.
 */
class ArabicText
{
    public static function normalize(string $text): string
    {
        // Diacritics, Quranic marks, tatweel and invisible joiners/marks.
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}\x{0640}\x{200C}\x{200D}\x{200E}\x{200F}]/u', '', $text);
        $text = strtr($text, [
            'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا',
            'ي' => 'ی', 'ى' => 'ی', 'ك' => 'ک', 'ة' => 'ه', 'ە' => 'ه',
        ]);
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim(mb_strtolower($text));
    }
}
