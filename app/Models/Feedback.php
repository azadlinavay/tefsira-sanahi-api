<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A message from someone using the website or an app. */
class Feedback extends Model
{
    public const KINDS = ['problem', 'tafsir', 'suggestion', 'review', 'other'];

    public const PLATFORMS = ['web', 'android', 'ios', 'windows'];

    public const STATUSES = ['new', 'seen', 'done'];

    protected $table = 'feedback';

    protected $guarded = [];

    protected $casts = ['rating' => 'integer'];

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'message' => $this->message,
            'rating' => $this->rating,
            'contact' => $this->contact,
            'ayah_key' => $this->ayah_key,
            'platform' => $this->platform,
            'app_version' => $this->app_version,
            'page' => $this->page,
            'status' => $this->status,
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
