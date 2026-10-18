<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Surah extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $guarded = [];

    public function ayahs(): HasMany
    {
        return $this->hasMany(Ayah::class)->orderBy('number');
    }
}
