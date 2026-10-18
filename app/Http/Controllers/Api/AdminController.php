<?php

namespace App\Http\Controllers\Api;

use App\Models\TafsirClip;
use App\Models\TafsirEdition;
use App\Support\ArabicText;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

/**
 * Corrections and uploads (e.g. from a dashboard). Requires
 * Authorization: Bearer <TEFSIRA_ADMIN_TOKEN>. After changing audio, rebuild
 * the affected packages: php artisan tafsir:build-packages <edition>.
 */
class AdminController extends ApiController
{
    public function updateText(Request $request, TafsirEdition $edition, int $surah, int $ayah): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string', 'max:20000']]);
        $a = $this->findAyah($surah, $ayah);

        $edition->texts()->updateOrCreate(['ayah_id' => $a->id], [
            'text' => trim($data['text']),
            'search_text' => ArabicText::normalize($data['text']),
        ]);

        return response()->json(['data' => Presenter::ayahs(collect([$a]), $edition)[0]]);
    }

    /** multipart/form-data: audio=<mp3>, optional duration_ms. Replaces the ayah's clip. */
    public function uploadAudio(Request $request, TafsirEdition $edition, int $surah, int $ayah): JsonResponse
    {
        $data = $request->validate([
            'audio' => ['required', 'file', 'mimetypes:audio/mpeg,audio/mp3', 'max:51200'],
            'duration_ms' => ['nullable', 'integer', 'min:1'],
        ]);
        $a = $this->findAyah($surah, $ayah);
        $path = TafsirClip::pathFor($edition->slug, $surah, $ayah);
        Storage::disk(config('tefsira.audio_disk'))->putFileAs(dirname($path), $data['audio'], basename($path), 'public');

        $edition->clips()->updateOrCreate(
            ['surah_id' => $surah, 'ayah_number' => $ayah],
            [
                'kind' => 'ayah',
                'path' => $path,
                'duration_ms' => $data['duration_ms'] ?? null,
                'size_bytes' => $data['audio']->getSize(),
                'qa_status' => 'uploaded',
                'needs_review' => false,
            ],
        );
        $edition->update(['has_audio' => true]);

        return response()->json(['data' => Presenter::ayahs(collect([$a]), $edition)[0]], 201);
    }

    public function deleteAudio(TafsirEdition $edition, int $surah, int $ayah): JsonResponse
    {
        $clip = $edition->clips()->where(['surah_id' => $surah, 'ayah_number' => $ayah])->firstOrFail();
        Storage::disk(config('tefsira.audio_disk'))->delete($clip->path);
        $clip->delete();

        return response()->json(null, 204);
    }

    /** Rebuild one surah or juz zip (the ~1 GB "all" package is built from the command line). */
    public function buildPackage(Request $request, TafsirEdition $edition): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', 'in:surah,juz'],
            'number' => ['required', 'integer', 'min:1', $request->input('scope') === 'juz' ? 'max:30' : 'max:114'],
        ]);

        Artisan::call('tafsir:build-packages', ['edition' => $edition->slug, '--by' => $data['scope'], '--only' => $data['number']]);
        $package = $edition->packages()->where(['scope' => $data['scope'], 'number' => $data['number']])->first();
        abort_unless($package, 422, 'Nothing to package: this '.$data['scope'].' has no audio.');

        return response()->json(['data' => [
            'name' => $package->name(),
            'clip_count' => $package->clip_count,
            'size_bytes' => $package->size_bytes,
            'sha256' => $package->sha256,
            'download_url' => url("/api/v1/tafsirs/{$edition->slug}/packages/{$package->name()}/download"),
        ]]);
    }
}
