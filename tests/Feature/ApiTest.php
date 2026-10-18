<?php

namespace Tests\Feature;

use App\Models\TafsirEdition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private const EDITION = 'tehsin-duski-ku';

    public function test_index_reports_version_and_counts(): void
    {
        $this->getJson('/api/v1')
            ->assertOk()
            ->assertHeader('X-API-Version', '1.0.0')
            ->assertJsonPath('data.version', '1.0.0')
            ->assertJsonPath('data.counts.ayahs', 6236)
            ->assertJsonPath('data.counts.tafsirs', 1);
    }

    public function test_surahs_list_and_basmala_rule(): void
    {
        $this->getJson('/api/v1/surahs')
            ->assertOk()
            ->assertJsonCount(114, 'data')
            ->assertJsonPath('data.0.has_basmala', false)  // Al-Fatiha: the basmala is ayah 1
            ->assertJsonPath('data.1.has_basmala', true)
            ->assertJsonPath('data.8.has_basmala', false); // At-Tawbah
    }

    public function test_surah_with_tafsir_and_recitation(): void
    {
        $this->getJson('/api/v1/surahs/112?tafsir='.self::EDITION.'&reciter=alafasy')
            ->assertOk()
            ->assertJsonCount(4, 'data.ayahs')
            ->assertJsonPath('data.ayahs.0.key', '112:1')
            ->assertJsonPath('data.ayahs.0.tafsir.edition', self::EDITION)
            ->assertJsonPath('data.ayahs.0.recitation.url', 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3');

        $this->assertNotEmpty($this->getJson('/api/v1/ayahs/2/255?tafsir='.self::EDITION)->json('data.tafsir.text'));
    }

    public function test_unknown_things_are_json_404s(): void
    {
        $this->getJson('/api/v1/surahs/115')->assertNotFound()->assertJsonStructure(['message']);
        $this->getJson('/api/v1/ayahs/1/8')->assertNotFound();
        $this->getJson('/api/v1/pages/605')->assertNotFound();
        $this->getJson('/api/v1/surahs/1?tafsir=nope')->assertNotFound();
        $this->getJson('/api/v1/tafsirs/nope')->assertNotFound();
        $this->getJson('/api/v1/tafsirs/'.self::EDITION.'/packages/surah-001')->assertNotFound();
    }

    public function test_mushaf_page_has_fifteen_lines(): void
    {
        $this->getJson('/api/v1/pages/3')->assertOk()->assertJsonCount(15, 'data.lines');

        // Pages 1–2 are the short decorated opening pages.
        $this->getJson('/api/v1/pages/2')
            ->assertOk()
            ->assertJsonCount(8, 'data.lines')
            ->assertJsonPath('data.lines.0.type', 'surah_header')
            ->assertJsonPath('data.lines.1.type', 'basmala');
    }

    public function test_search_ignores_diacritics(): void
    {
        $this->getJson('/api/v1/search?in=quran&q='.urlencode('الرحمن الرحيم'))
            ->assertOk()
            ->assertJsonPath('data.quran.data.0.key', '1:1')
            ->assertJsonPath('data.tafsir', null);

        $this->getJson('/api/v1/search?q=a')->assertUnprocessable();
    }

    public function test_reciters_and_donation(): void
    {
        $this->getJson('/api/v1/reciters')->assertOk()->assertJsonPath('data.0.is_default', true);
        $this->getJson('/api/v1/reciters/alafasy/surahs/1')->assertOk()->assertJsonCount(7, 'data.ayahs');

        $this->getJson('/api/v1/donation')
            ->assertOk()
            ->assertJsonPath('data.phone_e164', '+9647507601194')
            ->assertJsonPath('data.methods.*.id', ['fib', 'qi-card', 'fastpay', 'zaincash']);
    }

    public function test_admin_is_off_without_a_token_and_rejects_a_wrong_one(): void
    {
        config(['tefsira.admin_token' => null]);
        $this->putJson('/api/v1/admin/tafsirs/'.self::EDITION.'/ayahs/1/1/text', ['text' => 'x'])->assertNotFound();

        config(['tefsira.admin_token' => 'secret']);
        $this->putJson('/api/v1/admin/tafsirs/'.self::EDITION.'/ayahs/1/1/text', ['text' => 'x'], ['Authorization' => 'Bearer wrong'])->assertUnauthorized();
    }

    public function test_admin_updates_text_and_uploads_audio_then_packages_build(): void
    {
        Storage::fake('public');
        config(['tefsira.admin_token' => 'secret']);
        $auth = ['Authorization' => 'Bearer secret'];

        $this->putJson('/api/v1/admin/tafsirs/'.self::EDITION.'/ayahs/112/1/text', ['text' => 'تێکستێ نوو'], $auth)
            ->assertOk()
            ->assertJsonPath('data.tafsir.text', 'تێکستێ نوو');

        foreach (range(1, 4) as $ayah) {
            $mp3 = UploadedFile::fake()->createWithContent("$ayah.mp3", "ID3\x03\x00\x00\x00\x00\x00\x00".str_repeat("\xFF\xFB\x90\x00", 64));
            $this->post('/api/v1/admin/tafsirs/'.self::EDITION."/ayahs/112/$ayah/audio", ['audio' => $mp3, 'duration_ms' => 1000], $auth + ['Accept' => 'application/json'])
                ->assertCreated()
                ->assertJsonPath('data.tafsir.audio.duration_ms', 1000);
        }
        Storage::disk('public')->assertExists(self::EDITION.'/audio/112/112001.mp3');

        $this->postJson('/api/v1/admin/tafsirs/'.self::EDITION.'/packages', ['scope' => 'surah', 'number' => 112], $auth)
            ->assertOk()
            ->assertJsonPath('data.name', 'surah-112');

        $this->getJson('/api/v1/tafsirs/'.self::EDITION.'/packages')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'surah-112')
            ->assertJsonPath('data.0.clip_count', 4);
        $this->get('/api/v1/tafsirs/'.self::EDITION.'/packages/surah-112/download')->assertOk()->assertDownload(self::EDITION.'-surah-112.zip');

        $this->deleteJson('/api/v1/admin/tafsirs/'.self::EDITION.'/ayahs/112/1/audio', [], $auth)->assertNoContent();
        Storage::disk('public')->assertMissing(self::EDITION.'/audio/112/112001.mp3');
        $this->assertSame(3, TafsirEdition::firstWhere('slug', self::EDITION)->clips()->count());
    }
}
