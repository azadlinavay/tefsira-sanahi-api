<?php

namespace App\Support;

use App\Models\Ayah;
use App\Models\Reciter;
use App\Models\Surah;
use App\Models\TafsirClip;
use App\Models\TafsirEdition;
use Illuminate\Support\Collection;

/** Builds the JSON shapes the API returns (documented in docs/openapi.yaml). */
class Presenter
{
    public static function surah(Surah $s): array
    {
        return [
            'number' => $s->id,
            'name_ar' => $s->name_ar,
            'name_en' => $s->name_en,
            'revelation_place' => $s->revelation_place,
            'ayah_count' => $s->ayah_count,
            'pages' => [$s->page_start, $s->page_end],
            'juz_start' => $s->juz_start,
            'has_basmala' => ! in_array($s->id, [1, 9], true), // Al-Fatiha's basmala is ayah 1
        ];
    }

    /**
     * @param  Collection<int, Ayah>  $ayahs
     * @return array<int, array>
     */
    public static function ayahs(Collection $ayahs, ?TafsirEdition $edition = null, ?Reciter $reciter = null): array
    {
        $texts = $clips = collect();
        if ($edition) {
            $texts = $edition->texts()->whereIn('ayah_id', $ayahs->pluck('id'))->pluck('text', 'ayah_id');
            $clips = $edition->clips()
                ->where('kind', 'ayah')
                ->whereIn('surah_id', $ayahs->pluck('surah_id')->unique())
                ->get()
                ->keyBy(fn (TafsirClip $c) => $c->surah_id.':'.$c->ayah_number);
        }

        return $ayahs->map(fn (Ayah $a) => self::ayah($a, $edition, $texts[$a->id] ?? null, $clips[$a->key()] ?? null, $reciter))->all();
    }

    public static function ayah(Ayah $a, ?TafsirEdition $edition = null, ?string $tafsir = null, ?TafsirClip $clip = null, ?Reciter $reciter = null): array
    {
        $out = [
            'id' => $a->id,
            'key' => $a->key(),
            'surah' => $a->surah_id,
            'number' => $a->number,
            'page' => $a->page,
            'juz' => $a->juz,
            'text' => [
                'uthmani' => $a->text_uthmani,
                'simple' => $a->text_simple,
                'hafs_smart' => $a->text_hafs_smart,
            ],
        ];
        if ($edition) {
            $out['tafsir'] = [
                'edition' => $edition->slug,
                'text' => $tafsir,
                'audio' => $clip ? self::clip($clip) : null,
            ];
        }
        if ($reciter) {
            $out['recitation'] = ['reciter' => $reciter->id, 'url' => $reciter->urlFor($a)];
        }

        return $out;
    }

    public static function clip(TafsirClip $c): array
    {
        return [
            'url' => $c->url(),
            'duration_ms' => $c->duration_ms,
            'size_bytes' => $c->size_bytes,
            'needs_review' => $c->needs_review,
        ];
    }

    public static function edition(TafsirEdition $e): array
    {
        return [
            'slug' => $e->slug,
            'title' => $e->title,
            'author' => $e->author,
            'language' => $e->language,
            'dialect' => $e->dialect,
            'arabic_reciter' => $e->arabic_reciter,
            'has_audio' => $e->has_audio,
            'text_count' => $e->texts_count ?? $e->texts()->count(),
            'clip_count' => $e->clips_count ?? $e->clips()->count(),
        ];
    }
}
