<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reciter extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = ['is_default' => 'boolean', 'is_active' => 'boolean'];

    /** Recitation URL of one ayah: {sss}/{aaa} are 3-digit surah/ayah, {id} is 1–6236. */
    public function urlFor(Ayah $ayah): string
    {
        return strtr($this->url_template, [
            '{sss}' => str_pad((string) $ayah->surah_id, 3, '0', STR_PAD_LEFT),
            '{aaa}' => str_pad((string) $ayah->number, 3, '0', STR_PAD_LEFT),
            '{id}' => (string) $ayah->id,
        ]);
    }
}
