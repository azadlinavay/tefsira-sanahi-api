<?php

namespace Database\Seeders;

use App\Models\TafsirEdition;
use App\Support\ArabicText;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Tefsira Sanahi (Tehsin Ibrahim Duski), Kurdish Badini: the complete text. */
class TafsirSeeder extends Seeder
{
    public function run(): void
    {
        $edition = TafsirEdition::updateOrCreate(['slug' => 'tehsin-duski-ku'], [
            'title' => 'تەفسیرا ساناهی',
            'author' => 'Tehsin Ibrahim Duski',
            'language' => 'ku',
            'dialect' => 'badini',
            'arabic_reciter' => 'Saad Al-Ghamdi',
            'is_active' => true,
        ]);

        $texts = json_decode(file_get_contents(database_path('data/tafsir_ku.json')), true);
        // "surah:ayah" => ayah id (built in PHP so it works on SQLite and MySQL).
        $ids = DB::table('ayahs')->get(['id', 'surah_id', 'number'])
            ->mapWithKeys(fn ($a) => ["{$a->surah_id}:{$a->number}" => $a->id]);

        $now = now();
        $rows = [];
        foreach ($texts as $surah => $list) {
            foreach ($list as $i => $text) {
                $ayahId = $ids["$surah:".($i + 1)] ?? null;
                if ($ayahId === null || trim($text) === '') {
                    continue;
                }
                $rows[] = [
                    'tafsir_edition_id' => $edition->id,
                    'ayah_id' => $ayahId,
                    'text' => trim($text),
                    'search_text' => ArabicText::normalize($text),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::transaction(function () use ($rows) {
            foreach (array_chunk($rows, 300) as $chunk) {
                DB::table('tafsir_texts')->upsert($chunk, ['tafsir_edition_id', 'ayah_id'], ['text', 'search_text', 'updated_at']);
            }
        });

        $this->command?->info(count($rows).' tafsir texts for '.$edition->slug);
    }
}
