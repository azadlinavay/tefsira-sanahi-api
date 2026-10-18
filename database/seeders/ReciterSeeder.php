<?php

namespace Database\Seeders;

use App\Models\Reciter;
use Illuminate\Database\Seeder;

/** Per-ayah recitations (database/data/reciters.json). Add a reciter there. */
class ReciterSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('data/reciters.json')), true);
        foreach ($data['reciters'] as $i => $r) {
            Reciter::updateOrCreate(['id' => $r['id']], [
                'name' => $r['name'],
                'url_template' => $r['url'],
                'sort' => $i,
                'is_default' => $r['id'] === $data['default'],
                'is_active' => true,
            ]);
        }
        $this->command?->info(count($data['reciters']).' reciters');
    }
}
