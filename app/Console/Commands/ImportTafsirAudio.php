<?php

namespace App\Console\Commands;

use App\Models\TafsirClip;
use App\Models\TafsirEdition;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Records a tafsir's per-ayah audio from a manifest.json:
 *   { "ayahs": { "1:1": { "file": "audio/001/001001.mp3", "duration": 39.62, "source": "001.mp3", "start": 86.6, "end": 126.2, "status": "ok" }, … },
 *     "extras": { "istiadha": { "file": "audio/001/001000.mp3", "duration": 77.7, "label": "…" } } }
 *
 * With --copy the MP3s are copied to the audio disk (local storage or S3/R2) at
 * "{edition}/audio/SSS/SSSAAA.mp3". Without it, the files must already be there
 * (e.g. uploaded with rclone) and only the database is updated.
 */
class ImportTafsirAudio extends Command
{
    protected $signature = 'tafsir:import-audio
        {edition : Tafsir edition slug, e.g. tehsin-duski-ku}
        {source : Folder that contains manifest.json and the audio/ folder}
        {--copy : Copy the MP3 files to the audio disk}
        {--force : Overwrite files that already exist on the disk}';

    protected $description = 'Import per-ayah tafsir audio from a manifest.json';

    public function handle(): int
    {
        $edition = TafsirEdition::where('slug', $this->argument('edition'))->first();
        if (! $edition) {
            $this->error('Unknown edition. Run php artisan db:seed first.');

            return self::FAILURE;
        }

        $source = rtrim($this->argument('source'), '/\\');
        $manifestPath = $source.DIRECTORY_SEPARATOR.'manifest.json';
        if (! is_file($manifestPath)) {
            $this->error("No manifest.json in $source");

            return self::FAILURE;
        }
        $manifest = json_decode(file_get_contents($manifestPath), true, flags: JSON_THROW_ON_ERROR);

        $entries = [];
        foreach ($manifest['ayahs'] ?? [] as $key => $clip) {
            [$s, $a] = array_map('intval', explode(':', $key));
            $entries[] = [$s, $a, 'ayah', null, $clip];
        }
        // Intros recorded before an ayah (e.g. a'udhu billah before Al-Fatiha) are ayah 0.
        foreach ($manifest['extras'] ?? [] as $name => $clip) {
            if (preg_match('#/(\d{3})000\.mp3$#', $clip['file'], $m)) {
                $entries[] = [(int) $m[1], 0, 'intro', $clip['label'] ?? $name, $clip];
            }
        }

        $disk = Storage::disk(config('tefsira.audio_disk'));
        $copy = $this->option('copy');
        $missing = 0;
        $rows = [];
        $now = now();
        $bar = $this->output->createProgressBar(count($entries));

        foreach ($entries as [$s, $a, $kind, $label, $clip]) {
            $file = $source.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $clip['file']);
            $path = TafsirClip::pathFor($edition->slug, $s, $a);
            $size = is_file($file) ? filesize($file) : null;

            if ($copy) {
                if ($size === null) {
                    $missing++;
                    $bar->advance();

                    continue;
                }
                if ($this->option('force') || ! $disk->exists($path)) {
                    $stream = fopen($file, 'rb');
                    $disk->writeStream($path, $stream, ['visibility' => 'public', 'ContentType' => 'audio/mpeg']);
                    is_resource($stream) && fclose($stream);
                }
            }

            $rows[] = [
                'tafsir_edition_id' => $edition->id,
                'surah_id' => $s,
                'ayah_number' => $a,
                'kind' => $kind,
                'label' => $label,
                'path' => $path,
                'duration_ms' => isset($clip['duration']) ? (int) round($clip['duration'] * 1000) : null,
                'size_bytes' => $size,
                'source_file' => $clip['source'] ?? null,
                'source_start_ms' => isset($clip['start']) ? (int) round($clip['start'] * 1000) : null,
                'source_end_ms' => isset($clip['end']) ? (int) round($clip['end'] * 1000) : null,
                'qa_status' => $clip['status'] ?? null,
                'needs_review' => ($clip['status'] ?? 'ok') !== 'ok',
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        DB::transaction(function () use ($rows) {
            foreach (array_chunk($rows, 300) as $chunk) {
                DB::table('tafsir_clips')->upsert($chunk, ['tafsir_edition_id', 'surah_id', 'ayah_number'], [
                    'kind', 'label', 'path', 'duration_ms', 'size_bytes', 'source_file',
                    'source_start_ms', 'source_end_ms', 'qa_status', 'needs_review', 'updated_at',
                ]);
            }
        });
        $edition->update(['has_audio' => true]);

        $this->info(count($rows)." clips recorded for {$edition->slug}".($copy ? ' and copied' : '').'.');
        if ($missing) {
            $this->warn("$missing files listed in the manifest were not found and were skipped.");
        }

        return self::SUCCESS;
    }
}
