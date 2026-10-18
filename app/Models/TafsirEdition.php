<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TafsirEdition extends Model
{
    protected $guarded = [];

    protected $casts = ['has_audio' => 'boolean', 'is_active' => 'boolean'];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function texts(): HasMany
    {
        return $this->hasMany(TafsirText::class);
    }

    public function clips(): HasMany
    {
        return $this->hasMany(TafsirClip::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(AudioPackage::class);
    }
}
