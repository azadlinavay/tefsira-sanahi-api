<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AudioPackageController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\QuranController;
use App\Http\Controllers\Api\ReciterController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TafsirController;
use Illuminate\Support\Facades\Route;

/*
| Tefsira Sanahi API v1 — read-only and public, plus token-protected admin
| endpoints. Full reference: README.md and docs/openapi.yaml.
*/
Route::prefix('v1')->group(function () {
    Route::get('/', [MetaController::class, 'index']);
    Route::get('openapi.yaml', [MetaController::class, 'openapi']);
    Route::get('donation', [MetaController::class, 'donation']);

    // The Quran
    Route::get('surahs', [QuranController::class, 'surahs']);
    Route::get('surahs/{surah}', [QuranController::class, 'surah'])->whereNumber('surah');
    Route::get('ayahs/{surah}/{ayah}', [QuranController::class, 'ayah'])->whereNumber(['surah', 'ayah']);
    Route::get('pages/{page}', [PageController::class, 'show'])->whereNumber('page');
    Route::get('search', [SearchController::class, 'index']);

    // Reciters (Arabic recitation, one MP3 per ayah)
    Route::get('reciters', [ReciterController::class, 'index']);
    Route::get('reciters/{reciter}/surahs/{surah}', [ReciterController::class, 'surah'])->whereNumber('surah');

    // Tafsir: text and audio together
    Route::get('tafsirs', [TafsirController::class, 'index']);
    Route::get('tafsirs/{edition}', [TafsirController::class, 'show']);
    Route::get('tafsirs/{edition}/surahs/{surah}', [TafsirController::class, 'surah'])->whereNumber('surah');
    Route::get('tafsirs/{edition}/ayahs/{surah}/{ayah}', [TafsirController::class, 'ayah'])->whereNumber(['surah', 'ayah']);

    // Downloadable audio packages (zip: MP3s + text + manifest)
    Route::get('tafsirs/{edition}/packages', [AudioPackageController::class, 'index']);
    Route::get('tafsirs/{edition}/packages/{name}', [AudioPackageController::class, 'show']);
    Route::get('tafsirs/{edition}/packages/{name}/download', [AudioPackageController::class, 'download']);

    // Admin (Authorization: Bearer TEFSIRA_ADMIN_TOKEN)
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::put('tafsirs/{edition}/ayahs/{surah}/{ayah}/text', [AdminController::class, 'updateText'])->whereNumber(['surah', 'ayah']);
        Route::post('tafsirs/{edition}/ayahs/{surah}/{ayah}/audio', [AdminController::class, 'uploadAudio'])->whereNumber(['surah', 'ayah']);
        Route::delete('tafsirs/{edition}/ayahs/{surah}/{ayah}/audio', [AdminController::class, 'deleteAudio'])->whereNumber(['surah', 'ayah']);
        Route::post('tafsirs/{edition}/packages', [AdminController::class, 'buildPackage']);
    });
});
