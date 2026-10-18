<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AudioPackage extends Model
{
    protected $guarded = [];

    public function edition(): BelongsTo
    {
        return $this->belongsTo(TafsirEdition::class, 'tafsir_edition_id');
    }

    /** "surah-002", "juz-30", "all" */
    public function name(): string
    {
        return match ($this->scope) {
            'surah' => 'surah-'.str_pad((string) $this->number, 3, '0', STR_PAD_LEFT),
            'juz' => 'juz-'.str_pad((string) $this->number, 2, '0', STR_PAD_LEFT),
            default => 'all',
        };
    }
}
