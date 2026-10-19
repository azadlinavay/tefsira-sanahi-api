<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Serves the Tefsira Sanahi web app (the Flutter web build) from this site's
 * root. Every top-level file and folder of TEFSIRA_WEB_DIR is symlinked into
 * public/, so Nginx serves them directly: "/" becomes the web app's
 * index.html, while /api, /docs and /storage still reach Laravel.
 *
 * Runs on every deploy (composer post-autoload-dump). Without
 * TEFSIRA_WEB_DIR, or when the folder is missing, it does nothing.
 */
class LinkWebApp extends Command
{
    protected $signature = 'tefsira:link-web';

    protected $description = 'Link the web app build into public/ so it is served at the site root';

    /** Laravel's own files in public/ that the web build must never replace. */
    private const KEEP = ['index.php', '.htaccess', 'robots.txt', 'storage', 'favicon.ico'];

    public function handle(): int
    {
        $dir = config('tefsira.web_dir');
        if (! $dir || ! is_dir($dir)) {
            $this->line('No web app folder configured; skipping.');

            return self::SUCCESS;
        }

        // Drop links left by an older build whose files are gone.
        foreach (scandir(public_path()) as $name) {
            $path = public_path($name);
            if (is_link($path) && str_starts_with((string) readlink($path), $dir) && ! file_exists($path)) {
                unlink($path);
            }
        }

        $linked = 0;
        foreach (scandir($dir) as $name) {
            if ($name === '.' || $name === '..' || in_array($name, self::KEEP, true)) {
                continue;
            }
            $target = public_path($name);
            if (is_link($target)) {
                unlink($target);
            } elseif (file_exists($target)) {
                $this->warn("public/$name exists; not replaced.");

                continue;
            }
            symlink($dir.'/'.$name, $target);
            $linked++;
        }

        $this->info("Linked $linked web app entries into public/.");

        return self::SUCCESS;
    }
}
