<?php

namespace App\Console\Commands;

use App\Models\AudioPackage;
use App\Models\Ayah;
use App\Models\TafsirClip;
use App\Models\TafsirEdition;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

/**
 * Builds downloadable zips of a tafsir's audio + text, for offline use.
 * Each zip holds:
 *   audio/SSS/SSSAAA.mp3   one clip per ayah (SSS000.mp3 = an intro)
 *   tafsir.json            the ayahs' Quran text and tafsir text, keyed "surah:ayah"
 *   manifest.json          edition, scope, clip list with durations
 */
class BuildAudioPackages extends Command
{
    protected $signature = 'tafsir:build-packages
        {edition : Tafsir edition slug}
        {--by=surah : Comma-separated: surah, juz, all}
        {--only= : Build just this surah/juz number}';

    protected $description = 'Build downloadable audio packages (zip) for a tafsir';

    public function handle(): int
    {
        $edition = TafsirEdition::where('slug', $this->argument('edition'))->first();
        if (! $edition) {
            $this->error('Unknown edition.');

            return self::FAILURE;
        }

        $scopes = array_filter(array_map('trim', explode(',', $this->option('by'))));
        foreach ($scopes as $scope) {
            if (! in_array($scope, ['surah', 'juz', 'all'], true)) {
                $this->error("Unknown scope \"$scope\". Use surah, juz or all.");

                return self::FAILURE;
            }
            $numbers = match ($scope) {
                'surah' => range(1, 114),
                'juz' => range(1, 30),
                'all' => [0],
            };
            if ($this->option('only') !== null && $scope !== 'all') {
                $numbers = [(int) $this->option('only')];
            }
            foreach ($numbers as $n) {
                $this->build($edition, $scope, $n);
            }
        }

        return self::SUCCESS;
    }

    private function build(TafsirEdition $edition, string $scope, int $number): void
    {
        $ayahs = Ayah::query()
            ->when($scope === 'surah', fn ($q) => $q->where('surah_id', $number))
            ->when($scope === 'juz', fn ($q) => $q->where('juz', $number))
            ->orderBy('id')->get();
        $surahIds = $ayahs->pluck('surah_id')->unique();
        $clips = $edition->clips()->whereIn('surah_id', $surahIds)->orderBy('surah_id')->orderBy('ayah_number')->get()
            ->filter(fn (TafsirClip $c) => $c->kind === 'intro'
                ? $ayahs->contains(fn ($a) => $a->surah_id === $c->surah_id && $a->number === 1)
                : $ayahs->contains(fn ($a) => $a->surah_id === $c->surah_id && $a->number === $c->ayah_number));

        $package = new AudioPackage(['tafsir_edition_id' => $edition->id, 'scope' => $scope, 'number' => $number]);
        $name = $package->name();
        if ($clips->isEmpty()) {
            $this->warn("$name: no audio clips, skipped.");

            return;
        }

        $audio = Storage::disk(config('tefsira.audio_disk'));
        $local = config('filesystems.disks.'.config('tefsira.audio_disk').'.driver') === 'local';
        $tmp = storage_path('app/tmp/'.uniqid('pkg-'));
        File::ensureDirectoryExists($tmp);
        $zipPath = "$tmp/$name.zip";

        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($clips as $clip) {
            $entry = 'audio/'.substr(basename($clip->path), 0, 3).'/'.basename($clip->path);
            if ($local) {
                $file = $audio->path($clip->path);
            } else { // S3/R2: fetch to a temp file first (ZipArchive reads files on close)
                $file = "$tmp/".basename($clip->path);
                file_put_contents($file, $audio->readStream($clip->path));
            }
            $zip->addFile($file, $entry);
            $zip->setCompressionName($entry, ZipArchive::CM_STORE); // MP3s don't compress
        }
        $zip->addFromString('tafsir.json', json_encode($this->texts($edition, $ayahs), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $zip->addFromString('manifest.json', json_encode([
            'edition' => $edition->slug,
            'title' => $edition->title,
            'author' => $edition->author,
            'scope' => $scope,
            'number' => $number,
            'api_version' => config('tefsira.version'),
            'built_at' => now()->toIso8601String(),
            'clips' => $clips->map(fn (TafsirClip $c) => [
                'key' => "{$c->surah_id}:{$c->ayah_number}",
                'kind' => $c->kind,
                'label' => $c->label,
                'file' => 'audio/'.substr(basename($c->path), 0, 3).'/'.basename($c->path),
                'duration_ms' => $c->duration_ms,
            ])->values(),
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $zip->close();

        $path = "{$edition->slug}/packages/$name.zip";
        $stream = fopen($zipPath, 'rb');
        Storage::disk(config('tefsira.packages_disk'))->writeStream($path, $stream, ['visibility' => 'public', 'ContentType' => 'application/zip']);
        is_resource($stream) && fclose($stream);

        AudioPackage::updateOrCreate(
            ['tafsir_edition_id' => $edition->id, 'scope' => $scope, 'number' => $number],
            [
                'path' => $path,
                'size_bytes' => filesize($zipPath),
                'sha256' => hash_file('sha256', $zipPath),
                'clip_count' => $clips->count(),
                'duration_ms' => (int) $clips->sum('duration_ms'),
            ],
        );
        $this->line(sprintf('%-10s %4d clips  %7.1f MB', $name, $clips->count(), filesize($zipPath) / 1048576));
        File::deleteDirectory($tmp);
    }

    /** @param Collection<int, Ayah> $ayahs */
    private function texts(TafsirEdition $edition, Collection $ayahs): array
    {
        $tafsir = $edition->texts()->whereIn('ayah_id', $ayahs->pluck('id'))->pluck('text', 'ayah_id');

        return $ayahs->mapWithKeys(fn (Ayah $a) => [$a->key() => [
            'quran' => $a->text_uthmani,
            'tafsir' => $tafsir[$a->id] ?? null,
        ]])->all();
    }
}
