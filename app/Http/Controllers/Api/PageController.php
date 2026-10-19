<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PageController extends ApiController
{
    /**
     * A Madinah Mushaf page (1–604): its ayahs and its 15-line layout.
     * Each layout line is a surah title ("surah_header"), the basmala, or
     * runs of words [surah, ayah, first word, last word] (0-based indexes
     * into the ayah's words split on spaces).
     */
    public function show(Request $request, int $page): JsonResponse
    {
        abort_unless($page >= 1 && $page <= 604, 404, 'Page must be 1–604.');

        $layout = Cache::rememberForever('api.mushaf_layout', fn () => collect(
            json_decode(file_get_contents(database_path('data/mushaf_v2_layout.json')), true)['pages']
        )->keyBy('p')->all());

        $lines = array_map(fn ($l) => match ($l['t']) {
            'h' => ['type' => 'surah_header', 'surah' => $l['s']],
            'b' => ['type' => 'basmala', 'surah' => $l['s']],
            // em: natural width in em of the HafsSmart font (justify full
            // lines, centre short ones against ref_em).
            default => ['type' => 'ayah', 'words' => $l['w'], 'em' => $l['em'] ?? null],
        }, $layout[$page]['l']);

        $ayahs = Ayah::where('page', $page)->orderBy('id')->get();

        return response()->json(['data' => [
            'page' => $page,
            'ref_em' => 18.88,
            'lines' => $lines,
            'ayahs' => Presenter::ayahs($ayahs, $this->editionFrom($request), $this->reciterFrom($request)),
        ]]);
    }
}
