<?php

namespace Tests\Feature;

use App\Models\Feedback;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): array
    {
        config(['tefsira.admin_token' => 'secret']);

        return ['Authorization' => 'Bearer secret'];
    }

    public function test_anyone_can_send_feedback(): void
    {
        $this->postJson('/api/v1/feedback', [
            'kind' => 'tafsir',
            'message' => 'The tafsir of 18:23 is the one for 18:2.',
            'ayah_key' => '18:23',
            'platform' => 'web',
            'page' => '/page/296',
        ])->assertCreated()->assertJsonPath('data.received', true);

        $this->assertDatabaseHas('feedback', ['kind' => 'tafsir', 'ayah_key' => '18:23', 'status' => 'new']);
    }

    public function test_feedback_is_validated(): void
    {
        $this->postJson('/api/v1/feedback', ['kind' => 'spam', 'message' => '', 'platform' => 'fax'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['kind', 'message', 'platform']);
        $this->postJson('/api/v1/feedback', ['kind' => 'review', 'message' => 'Great', 'rating' => 9, 'platform' => 'android', 'ayah_key' => 'x'])
            ->assertJsonValidationErrors(['rating', 'ayah_key']);
    }

    public function test_bots_filling_the_hidden_field_are_ignored(): void
    {
        $this->postJson('/api/v1/feedback', ['kind' => 'other', 'message' => 'buy now', 'platform' => 'web', 'website' => 'spam.example'])
            ->assertCreated();
        $this->assertDatabaseCount('feedback', 0);
    }

    public function test_sending_is_rate_limited(): void
    {
        $body = ['kind' => 'other', 'message' => 'Hello there', 'platform' => 'web'];
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/feedback', $body)->assertCreated();
        }
        $this->postJson('/api/v1/feedback', $body)->assertStatus(429);
    }

    public function test_only_the_admin_reads_and_handles_feedback(): void
    {
        $f = Feedback::create(['kind' => 'problem', 'message' => 'Audio stops', 'platform' => 'windows', 'status' => 'new']);
        config(['tefsira.admin_token' => 'secret']);
        $this->getJson('/api/v1/admin/feedback')->assertStatus(401);

        $this->getJson('/api/v1/admin/feedback?status=new', $this->admin())
            ->assertOk()
            ->assertJsonPath('data.0.message', 'Audio stops')
            ->assertJsonPath('meta.counts.new', 1);

        $this->patchJson("/api/v1/admin/feedback/{$f->id}", ['status' => 'done', 'note' => 'Fixed in 2.0.1'], $this->admin())
            ->assertOk()
            ->assertJsonPath('data.status', 'done');

        $this->deleteJson("/api/v1/admin/feedback/{$f->id}", [], $this->admin())->assertNoContent();
        $this->assertDatabaseCount('feedback', 0);
    }
}
