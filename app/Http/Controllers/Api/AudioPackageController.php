<?php

namespace App\Http\Controllers\Api;

use App\Models\AudioPackage;
use App\Models\TafsirEdition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AudioPackageController extends ApiController
{
    /** Built packages: one per surah, per juz, and the whole tafsir ("all"). ?scope=surah|juz|all */
    public function index(Request $request, TafsirEdition $edition): JsonResponse
    {
        $packages = $edition->packages()
            ->when($request->query('scope'), fn ($q, $scope) => $q->where('scope', $scope))
            ->orderBy('scope')->orderBy('number')->get()
            ->map(fn (AudioPackage $p) => $this->present($edition, $p));

        return response()->json(['data' => $packages]);
    }

    public function show(TafsirEdition $edition, string $name): JsonResponse
    {
        return response()->json(['data' => $this->present($edition, $this->find($edition, $name))]);
    }

    /** Streams the zip from this server, or redirects to the S3/R2 URL. */
    public function download(TafsirEdition $edition, string $name): Response
    {
        $package = $this->find($edition, $name);
        $disk = Storage::disk(config('tefsira.packages_disk'));
        $filename = "{$edition->slug}-{$package->name()}.zip";

        if (config('filesystems.disks.'.config('tefsira.packages_disk').'.driver') === 's3') {
            return redirect()->away($disk->url($package->path));
        }

        return $disk->download($package->path, $filename, ['Content-Type' => 'application/zip']);
    }

    private function find(TafsirEdition $edition, string $name): AudioPackage
    {
        if ($name === 'all') {
            [$scope, $number] = ['all', 0];
        } elseif (preg_match('/^(surah|juz)-(\d{1,3})$/', $name, $m)) {
            [$scope, $number] = [$m[1], (int) $m[2]];
        } else {
            abort(404, 'Package names look like "surah-002", "juz-30" or "all".');
        }

        return $edition->packages()->where(['scope' => $scope, 'number' => $number])->firstOr(
            fn () => abort(404, "Package \"$name\" has not been built.")
        );
    }

    private function present(TafsirEdition $edition, AudioPackage $p): array
    {
        return [
            'name' => $p->name(),
            'scope' => $p->scope,
            'number' => $p->number,
            'clip_count' => $p->clip_count,
            'duration_ms' => $p->duration_ms,
            'size_bytes' => $p->size_bytes,
            'sha256' => $p->sha256,
            'updated_at' => $p->updated_at?->toIso8601String(),
            'download_url' => url("/api/v1/tafsirs/{$edition->slug}/packages/{$p->name()}/download"),
        ];
    }
}
