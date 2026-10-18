<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * The Quran, Tefsira Sanahi's Kurdish text and the reciters.
     * Audio clips are imported separately: php artisan tafsir:import-audio
     */
    public function run(): void
    {
        $this->call([QuranSeeder::class, TafsirSeeder::class, ReciterSeeder::class]);
    }
}
