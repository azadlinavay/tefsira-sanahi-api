<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\TafsirClip;
use App\Models\TafsirEdition;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TafsirController extends ApiController
{
    public function index(): JsonResponse
    {
        $editions = TafsirEdition::where('is_active', true)->withCount(['texts', 'clips'])->get();

        return response()->json(['data' => $editions->map(Presenter::edition(...))]);
    }

    public function show(TafsirEdition $edition): JsonResponse
    {
        return response()->json(['data' => Presenter::edition($edition->loadCount(['texts', 'clips']))]);
    }

    /** Every ayah of a surah with its tafsir text and audio together (plus intros, e.g. a'udhu billah before Al-Fatiha). */
    public function surah(Request $request, TafsirEdition $edition, int $surah): JsonResponse
    {
        $s = $this->findSurah($surah);
        $ayahs = Ayah::where('surah_id', $surah)->orderBy('number')->get();
        $intros = $edition->clips()->where(['surah_id' => $surah, 'kind' => 'intro'])->get()
            ->map(fn (TafsirClip $c) => ['label' => $c->label] + Presenter::clip($c));

        return response()->json(['data' => [
            'edition' => $edition->slug,
            'surah' => Presenter::surah($s),
            'intros' => $intros,
            'ayahs' => Presenter::ayahs($ayahs, $edition, $this->reciterFrom($request)),
        ]]);
    }

    public function ayah(Request $request, TafsirEdition $edition, int $surah, int $ayah): JsonResponse
    {
        $a = $this->findAyah($surah, $ayah);

        return response()->json(['data' => Presenter::ayahs(collect([$a]), $edition, $this->reciterFrom($request))[0]]);
    }
}
