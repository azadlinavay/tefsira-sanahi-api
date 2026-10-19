<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\TafsirEdition;
use App\Models\TafsirText;
use App\Support\ArabicText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SearchController extends ApiController
{
    /**
     * Searches the Quran (imla'i text) and/or a tafsir, ignoring diacritics
     * and Arabic/Kurdish letter variants.
     *
     * ?q=          words to find (2+ letters). "quoted words" must appear together,
     *              -word must not appear.
     * ?mode=       all (every word, default) | any (at least one) | phrase (the whole query, in order)
     * ?in=         quran | tafsir | all (default)
     * ?surah=, ?juz=  limit to one surah or juz
     * ?tafsir=slug, ?per_page= (max 50), ?quran_page=, ?tafsir_page=
     *
     * Results are ranked: the whole query as written first, then by how many
     * words match, then in Mushaf order.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'in' => ['nullable', 'in:quran,tafsir,all'],
            'mode' => ['nullable', 'in:all,any,phrase'],
            'surah' => ['nullable', 'integer', 'min:1', 'max:114'],
            'juz' => ['nullable', 'integer', 'min:1', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $in = $data['in'] ?? 'all';
        $mode = $data['mode'] ?? 'all';
        $perPage = $data['per_page'] ?? 20;
        $query = $this->parse($data['q'], $mode);
        if (! $query['phrase'] && ! $query['terms']) {
            return response()->json([
                'message' => 'The q field needs at least one word of 2+ letters.',
                'errors' => ['q' => ['The q field needs at least one word of 2+ letters.']],
            ], 422);
        }
        $edition = $this->editionFrom($request) ?? TafsirEdition::where('slug', 'tehsin-duski-ku')->first();

        $quran = null;
        if ($in !== 'tafsir') {
            $q = Ayah::query();
            $this->filter($q, $data);
            $quran = $this->match($q, 'ayahs.search_text', $query, 'ayahs.id')
                ->paginate($perPage, ['ayahs.*'], 'quran_page')->withQueryString()
                ->through(fn (Ayah $a) => ['key' => $a->key(), 'page' => $a->page, 'juz' => $a->juz, 'text' => $a->text_uthmani]);
        }

        $tafsir = null;
        if ($in !== 'quran' && $edition) {
            $q = TafsirText::query()->with('ayah')
                ->join('ayahs', 'ayahs.id', '=', 'tafsir_texts.ayah_id')
                ->where('tafsir_texts.tafsir_edition_id', $edition->id);
            $this->filter($q, $data);
            $tafsir = $this->match($q, 'tafsir_texts.search_text', $query, 'tafsir_texts.ayah_id')
                ->paginate($perPage, ['tafsir_texts.*'], 'tafsir_page')->withQueryString()
                ->through(fn (TafsirText $t) => [
                    'key' => $t->ayah->key(),
                    'page' => $t->ayah->page,
                    'edition' => $edition->slug,
                    'snippet' => $this->snippet($t->text, $query['highlight']),
                ]);
        }

        return response()->json(['data' => [
            'query' => $data['q'],
            'mode' => $mode,
            // Normalised words to highlight in the results.
            'words' => $query['highlight'],
            'quran' => $quran,
            'tafsir' => $tafsir,
        ]]);
    }

    /**
     * Splits the query into a phrase (quoted, or the whole query in phrase
     * mode), separate words and excluded (-word) words, all normalised.
     *
     * @return array{phrase: ?string, terms: string[], exclude: string[], any: bool, highlight: string[]}
     */
    private function parse(string $raw, string $mode): array
    {
        $phrase = null;
        $exclude = [];
        $raw = str_replace(['«', '»', '“', '”'], '"', $raw);
        if (preg_match('/"([^"]+)"/u', $raw, $m)) {
            $phrase = ArabicText::normalize($m[1]);
            $raw = str_replace($m[0], ' ', $raw);
        }
        $terms = [];
        foreach (preg_split('/\s+/u', ArabicText::normalize($raw), -1, PREG_SPLIT_NO_EMPTY) as $word) {
            if (str_starts_with($word, '-')) {
                if (mb_strlen($word) > 2) {
                    $exclude[] = mb_substr($word, 1);
                }
            } elseif (mb_strlen($word) >= 2) {
                $terms[] = $word;
            }
        }
        if ($mode === 'phrase' && ! $phrase) {
            $phrase = implode(' ', $terms) ?: null;
            $terms = [];
        }
        $terms = array_values(array_unique($terms));
        $highlight = array_values(array_unique(array_filter([$phrase, ...$terms])));

        return ['phrase' => $phrase ?: null, 'terms' => $terms, 'exclude' => $exclude, 'any' => $mode === 'any', 'highlight' => $highlight];
    }

    private function filter(Builder $q, array $data): void
    {
        if (! empty($data['surah'])) {
            $q->where('ayahs.surah_id', $data['surah']);
        }
        if (! empty($data['juz'])) {
            $q->where('ayahs.juz', $data['juz']);
        }
    }

    /** Adds the word conditions and the ranking to a query. */
    private function match(Builder $q, string $column, array $query, string $order): Builder
    {
        $like = fn (string $s) => '%'.addcslashes($s, '%_\\').'%';
        $col = DB::connection()->getQueryGrammar()->wrap($column);

        if ($query['phrase']) {
            $q->where($column, 'like', $like($query['phrase']));
        }
        if ($query['terms']) {
            $q->where(function (Builder $w) use ($query, $column, $like) {
                foreach ($query['terms'] as $term) {
                    $query['any'] ? $w->orWhere($column, 'like', $like($term)) : $w->where($column, 'like', $like($term));
                }
            });
        }
        foreach ($query['exclude'] as $term) {
            $q->where($column, 'not like', $like($term));
        }

        // Rank: the whole query as written, then the number of matching words.
        $score = ["CASE WHEN $col LIKE ? THEN 100 ELSE 0 END"];
        $bindings = [$like(implode(' ', array_filter([$query['phrase'], ...$query['terms']])))];
        foreach ($query['terms'] as $term) {
            $score[] = "CASE WHEN $col LIKE ? THEN 1 ELSE 0 END";
            $bindings[] = $like($term);
        }
        $q->orderByRaw('('.implode(' + ', $score).') DESC', $bindings)->orderBy($order);

        return $q;
    }

    /** ~220 characters around the first matching word (falls back to the start). */
    private function snippet(string $text, array $words): string
    {
        [$normal, $map] = ArabicText::normalizeWithMap($text);
        $pos = null;
        foreach ($words as $w) {
            $p = mb_strpos($normal, $w);
            if ($p !== false && ($pos === null || $p < $pos)) {
                $pos = $p;
            }
        }
        $at = $pos === null ? 0 : $map[$pos];
        $start = max(0, $at - 80);
        // Start on a word boundary.
        if ($start > 0 && ($space = mb_strpos($text, ' ', $start)) !== false && $space < $at) {
            $start = $space + 1;
        }
        $length = 220;

        return ($start > 0 ? '…' : '').trim(mb_substr($text, $start, $length)).(mb_strlen($text) > $start + $length ? '…' : '');
    }
}
