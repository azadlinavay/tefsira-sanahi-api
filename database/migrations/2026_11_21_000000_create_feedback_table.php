<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Messages people send from the website and the apps: problems,
        // suggestions, a wrong tafsir passage, reviews. Read in the dashboard.
        Schema::create('feedback', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20); // problem | tafsir | suggestion | review | other
            $table->text('message');
            $table->unsignedTinyInteger('rating')->nullable(); // 1–5, for reviews
            $table->string('contact', 190)->nullable(); // only if the person gives it
            $table->string('ayah_key', 9)->nullable(); // "2:255" when it is about an ayah
            $table->string('platform', 20); // web | android | ios | windows
            $table->string('app_version', 40)->nullable();
            $table->string('page', 255)->nullable(); // where it was sent from
            $table->string('status', 10)->default('new'); // new | seen | done
            $table->text('note')->nullable(); // the team's own note
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
