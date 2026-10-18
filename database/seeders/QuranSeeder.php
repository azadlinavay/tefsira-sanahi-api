<?php

namespace Database\Seeders;

use App\Support\ArabicText;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Surahs and ayahs from database/data (the same files the app ships). */
class QuranSeeder extends Seeder
{
    public function run(): void
    {
        $data = database_path('data');
        $meta = json_decode(file_get_contents("$data/surah.json"), true)['surah'];
        $smart = json_decode(file_get_contents("$data/hafs_smart_v8.json"), true);
        $uthmani = json_decode(file_get_contents("$data/quran_text.json"), true);
        $layout = json_decode(file_get_contents("$data/mushaf_v2_layout.json"), true);

        // Page each ayah starts on, in the KFGQPC V2 (1421H) Madinah layout.
        $pages = [];
        foreach ($layout['pages'] as $page) {
            foreach ($page['l'] as $line) {
                foreach ($line['w'] ?? [] as [$s, $a]) {
                    $pages["$s:$a"] ??= $page['p'];
                }
            }
        }

        $ayahs = [];
        $surahs = [];
        foreach ($smart as $row) {
            $s = $row['sura_no'];
            $a = $row['aya_no'];
            $page = $pages["$s:$a"] ?? $row['page'];
            $simple = $row['aya_text_emlaey'];
            $ayahs[] = [
                'id' => $row['id'],
                'surah_id' => $s,
                'number' => $a,
                'page' => $page,
                'juz' => $row['jozz'],
                'text_uthmani' => $uthmani[(string) $s][$a - 1] ?? $simple,
                'text_simple' => $simple,
                'text_hafs_smart' => trim($row['aya_text']),
                'search_text' => ArabicText::normalize($simple),
            ];
            $surahs[$s] ??= ['name_ar' => trim($row['sura_name_ar']), 'page_start' => $page, 'juz_start' => $row['jozz']];
            $surahs[$s]['page_end'] = $page;
        }

        DB::transaction(function () use ($meta, $surahs, $ayahs) {
            foreach ($meta as $m) {
                $s = $m['id'];
                DB::table('surahs')->upsert([[
                    'id' => $s,
                    'name_ar' => $surahs[$s]['name_ar'],
                    'name_en' => $m['name'],
                    'revelation_place' => $m['location'] === 'makkah' ? 'makkah' : 'madinah',
                    'ayah_count' => $m['total'],
                    'page_start' => $surahs[$s]['page_start'],
                    'page_end' => $surahs[$s]['page_end'],
                    'juz_start' => $surahs[$s]['juz_start'],
                ]], ['id']);
            }
            foreach (array_chunk($ayahs, 500) as $chunk) {
                DB::table('ayahs')->upsert($chunk, ['id']);
            }
        });

        $this->command?->info(count($meta).' surahs, '.count($ayahs).' ayahs');
    }
}
