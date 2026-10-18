<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\TafsirEdition;
use App\Models\TafsirText;
use App\Support\ArabicText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends ApiController
{
    /**
     * ?q= (2+ letters) — searches the Quran (imla'i text) and/or a tafsir,
     * ignoring diacritics and Arabic/Kurdish letter variants.
     * ?in=quran|tafsir|all (default all), ?tafsir=slug, ?per_page= (max 50).
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'in' => ['nullable', 'in:quran,tafsir,all'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $needle = ArabicText::normalize($data['q']);
        $in = $data['in'] ?? 'all';
        $perPage = $data['per_page'] ?? 20;
        $like = '%'.addcslashes($needle, '%_\\').'%';
        $edition = $this->editionFrom($request) ?? TafsirEdition::where('slug', 'tehsin-duski-ku')->first();

        $quran = $in === 'tafsir' ? null : Ayah::where('search_text', 'like', $like)->orderBy('id')
            ->paginate($perPage, ['*'], 'quran_page')->withQueryString()
            ->through(fn (Ayah $a) => ['key' => $a->key(), 'page' => $a->page, 'text' => $a->text_uthmani]);

        $tafsir = ($in === 'quran' || ! $edition) ? null : TafsirText::with('ayah')
            ->where('tafsir_edition_id', $edition->id)->where('search_text', 'like', $like)->orderBy('ayah_id')
            ->paginate($perPage, ['*'], 'tafsir_page')->withQueryString()
            ->through(fn (TafsirText $t) => ['key' => $t->ayah->key(), 'edition' => $edition->slug, 'snippet' => $this->snippet($t->text, $data['q'])]);

        return response()->json(['data' => ['query' => $data['q'], 'quran' => $quran, 'tafsir' => $tafsir]]);
    }

    /** ~200 characters around the first match (falls back to the start). */
    private function snippet(string $text, string $q): string
    {
        $pos = mb_stripos($text, $q);
        $start = $pos === false ? 0 : max(0, $pos - 80);

        return ($start > 0 ? '…' : '').mb_substr($text, $start, 200).(mb_strlen($text) > $start + 200 ? '…' : '');
    }
}
