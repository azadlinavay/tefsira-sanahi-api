<?php

namespace App\Http\Controllers\Api;

use App\Models\Ayah;
use App\Models\Surah;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class QuranController extends ApiController
{
    /** All 114 surahs. */
    public function surahs(): JsonResponse
    {
        $data = Cache::rememberForever('api.surahs', fn () => Surah::orderBy('id')->get()->map(Presenter::surah(...))->all());

        return response()->json(['data' => $data]);
    }

    /** One surah with its ayahs; ?tafsir=slug adds text + audio, ?reciter=id adds recitation URLs. */
    public function surah(Request $request, int $surah): JsonResponse
    {
        $s = $this->findSurah($surah);
        $ayahs = Ayah::where('surah_id', $surah)->orderBy('number')->get();

        return response()->json(['data' => [
            'surah' => Presenter::surah($s),
            'ayahs' => Presenter::ayahs($ayahs, $this->editionFrom($request), $this->reciterFrom($request)),
        ]]);
    }

    public function ayah(Request $request, int $surah, int $ayah): JsonResponse
    {
        $a = $this->findAyah($surah, $ayah);

        return response()->json(['data' => Presenter::ayahs(collect([$a]), $this->editionFrom($request), $this->reciterFrom($request))[0]]);
    }
}
