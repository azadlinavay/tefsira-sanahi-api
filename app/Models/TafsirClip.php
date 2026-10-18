<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TafsirClip extends Model
{
    protected $guarded = [];

    protected $casts = ['needs_review' => 'boolean'];

    public function edition(): BelongsTo
    {
        return $this->belongsTo(TafsirEdition::class, 'tafsir_edition_id');
    }

    /** Public URL of the MP3 on the audio disk (local or S3/R2). */
    public function url(): string
    {
        return Storage::disk(config('tefsira.audio_disk'))->url($this->path);
    }

    /** Where a clip lives on the audio disk: "{edition}/audio/SSS/SSSAAA.mp3". */
    public static function pathFor(string $edition, int $surah, int $ayah): string
    {
        $s = str_pad((string) $surah, 3, '0', STR_PAD_LEFT);
        $a = str_pad((string) $ayah, 3, '0', STR_PAD_LEFT);

        return "{$edition}/audio/{$s}/{$s}{$a}.mp3";
    }
}
