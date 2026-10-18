<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ayah;
use App\Models\Reciter;
use App\Models\Surah;
use App\Models\TafsirEdition;
use Illuminate\Http\Request;

/** Shared helpers: resolving ?tafsir= and ?reciter=, and 404s for bad numbers. */
abstract class ApiController extends Controller
{
    protected function editionFrom(Request $request): ?TafsirEdition
    {
        $slug = $request->query('tafsir');
        if ($slug === null || $slug === '') {
            return null;
        }

        return TafsirEdition::where('slug', $slug)->where('is_active', true)->firstOr(
            fn () => abort(404, "Unknown tafsir edition \"$slug\".")
        );
    }

    protected function reciterFrom(Request $request): ?Reciter
    {
        $id = $request->query('reciter');
        if ($id === null || $id === '') {
            return null;
        }

        return Reciter::where('id', $id)->where('is_active', true)->firstOr(
            fn () => abort(404, "Unknown reciter \"$id\".")
        );
    }

    protected function findSurah(int $number): Surah
    {
        return Surah::findOr($number, fn () => abort(404, 'Surah must be 1–114.'));
    }

    protected function findAyah(int $surah, int $ayah): Ayah
    {
        return Ayah::where(['surah_id' => $surah, 'number' => $ayah])->firstOr(
            fn () => abort(404, "Ayah $surah:$ayah does not exist.")
        );
    }
}
