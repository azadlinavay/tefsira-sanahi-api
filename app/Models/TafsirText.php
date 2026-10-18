<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TafsirText extends Model
{
    protected $guarded = [];

    protected $hidden = ['search_text'];

    public function edition(): BelongsTo
    {
        return $this->belongsTo(TafsirEdition::class, 'tafsir_edition_id');
    }

    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }
}
