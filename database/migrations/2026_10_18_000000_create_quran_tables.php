<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surahs', function (Blueprint $table) {
            $table->unsignedSmallInteger('id')->primary(); // 1–114
            $table->string('name_ar');
            $table->string('name_en');
            $table->enum('revelation_place', ['makkah', 'madinah']);
            $table->unsignedSmallInteger('ayah_count');
            $table->unsignedSmallInteger('page_start');
            $table->unsignedSmallInteger('page_end');
            $table->unsignedTinyInteger('juz_start');
        });

        Schema::create('ayahs', function (Blueprint $table) {
            $table->unsignedSmallInteger('id')->primary(); // 1–6236, whole-Quran number
            $table->unsignedSmallInteger('surah_id');
            $table->unsignedSmallInteger('number'); // ayah number in its surah
            $table->unsignedSmallInteger('page'); // Madinah Mushaf, KFGQPC V2 (1421H)
            $table->unsignedTinyInteger('juz');
            $table->text('text_uthmani'); // Unicode Uthmani script with diacritics
            $table->text('text_simple'); // without diacritics (imla'i)
            $table->text('text_hafs_smart'); // glyph codes for the KFGQPC HafsSmart font
            $table->text('search_text'); // normalised for search
            $table->unique(['surah_id', 'number']);
            $table->index('page');
            $table->foreign('surah_id')->references('id')->on('surahs');
        });

        Schema::create('tafsir_editions', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('author');
            $table->string('language', 8);
            $table->string('dialect')->nullable();
            $table->string('arabic_reciter')->nullable(); // reciter heard in the original recordings
            $table->boolean('has_audio')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tafsir_texts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tafsir_edition_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('ayah_id');
            $table->longText('text');
            $table->longText('search_text');
            $table->timestamps();
            $table->unique(['tafsir_edition_id', 'ayah_id']);
            $table->foreign('ayah_id')->references('id')->on('ayahs');
        });

        Schema::create('tafsir_clips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tafsir_edition_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('surah_id');
            $table->unsignedSmallInteger('ayah_number'); // 0 = an intro (e.g. a'udhu billah)
            $table->string('kind', 16)->default('ayah'); // ayah | intro
            $table->string('label')->nullable();
            $table->string('path'); // on the audio disk
            $table->unsignedInteger('duration_ms')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('source_file')->nullable();
            $table->unsignedInteger('source_start_ms')->nullable();
            $table->unsignedInteger('source_end_ms')->nullable();
            $table->string('qa_status', 16)->nullable();
            $table->boolean('needs_review')->default(false);
            $table->timestamps();
            $table->unique(['tafsir_edition_id', 'surah_id', 'ayah_number']);
        });

        Schema::create('reciters', function (Blueprint $table) {
            $table->string('id')->primary(); // slug, e.g. "alafasy"
            $table->string('name');
            $table->string('url_template'); // {sss} {aaa} {id}
            $table->unsignedSmallInteger('sort')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
        });

        Schema::create('audio_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tafsir_edition_id')->constrained()->cascadeOnDelete();
            $table->string('scope', 8); // surah | juz | all
            $table->unsignedSmallInteger('number')->default(0); // surah or juz number; 0 for "all"
            $table->string('path');
            $table->unsignedBigInteger('size_bytes');
            $table->string('sha256', 64);
            $table->unsignedSmallInteger('clip_count');
            $table->unsignedInteger('duration_ms')->default(0);
            $table->timestamps();
            $table->unique(['tafsir_edition_id', 'scope', 'number']);
        });
    }

    public function down(): void
    {
        foreach (['audio_packages', 'reciters', 'tafsir_clips', 'tafsir_texts', 'tafsir_editions', 'ayahs', 'surahs'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
