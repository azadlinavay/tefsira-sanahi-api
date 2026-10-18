<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ayah extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $guarded = [];

    protected $hidden = ['search_text'];

    public function surah(): BelongsTo
    {
        return $this->belongsTo(Surah::class);
    }

    public function tafsirTexts(): HasMany
    {
        return $this->hasMany(TafsirText::class);
    }

    /** "2:255" */
    public function key(): string
    {
        return $this->surah_id.':'.$this->number;
    }
}
