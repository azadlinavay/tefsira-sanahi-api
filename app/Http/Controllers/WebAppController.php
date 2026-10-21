<?php

namespace App\Http\Controllers;

use App\Models\Ayah;
use App\Models\Surah;
use App\Models\TafsirEdition;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Serves the web app's index.html for its paths (/surah/2/255, /page/42 …)
 * with that page's title, description, link-preview tags and readable text
 * already in the HTML, so search engines and link previews see real content.
 * The app replaces the text when it starts.
 */
class WebAppController extends Controller
{
    private const SITE = 'تەفسیرا ساناهی';

    public function __invoke(Request $request): Response
    {
        $index = public_path('index.html');
        abort_if($request->is('api/*') || ! is_file($index), 404);

        $path = trim($request->path(), '/');
        $page = Cache::remember('seo:'.md5($path.'|'.filemtime($index)), now()->addDay(), fn () => $this->page($path));
        $html = $this->inject((string) file_get_contents($index), $page);

        return response($html, $page['status'] ?? 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache',
        ]);
    }

    /** @return array{title: string, description: string, path: string, body: string, crumbs?: array, status?: int} */
    private function page(string $path): array
    {
        // /tafsir/… (tafsir-only reading) shares the surah page's text; its
        // canonical link points to /surah/….
        if (preg_match('#^(?:surah|tafsir)/(\d{1,3})(?:/(\d{1,3}))?$#', $path, $m)) {
            $surah = Surah::find((int) $m[1]);
            if ($surah && isset($m[2])) {
                $ayah = Ayah::where('surah_id', $surah->id)->where('number', (int) $m[2])->first();

                return $ayah ? $this->ayahPage($surah, $ayah) : $this->notFound();
            }

            return $surah ? $this->surahPage($surah) : $this->notFound();
        }
        if (preg_match('#^page/(\d{1,3})$#', $path, $m)) {
            return $this->mushafPage((int) $m[1]);
        }

        return match ($path) {
            'quran' => $this->simple('quran', 'قورئانا پیروز — هەمی سوورەت دگەل تەفسیرا ساناهی', 'هەمی ١١٤ سوورەتێن قورئانێ دگەل تەفسیرا ساناهی ب کوردی: مسحەفا مەدینێ، تەفسیر بتنێ، دەنگ، لێگەریان و نیشانکری.'),
            'listen' => $this->simple('listen', 'گوهداریا قورئان و تەفسیرێ', 'گوهداریا قورئانا پیروز و تەفسیرا ساناهی یا دەنگی ب کوردی بکە: قورئان و تەفسیر، قورئان بتنێ یان تەفسیر بتنێ — سورەتەک، جوزئەک یان ژ ئایەتەکێ، دگەل دەمژمێرا خەوێ.'),
            'search' => $this->simple('search', 'لێگەریان د قورئان و تەفسیرێ دا', 'لێگەریان د قورئانا پیروز (ب عەرەبیا سادە) و د تەفسیرا ساناهی ب کوردی دا.'),
            'about' => $this->simple('about', 'دەربارەی تەفسیرا ساناهی', 'تەفسیرا ساناهی: قورئانا پیروز دگەل تەفسیرا تەحسین ئیبراهیم دۆسکی ب کوردی (بادینی)، نڤیسین و دەنگ.'),
            'support' => $this->simple('support', 'پشتەڤانیا تەفسیرا ساناهی بکە', 'پشتەڤانیا ئەپلیکەیشن و ماڵپەڕا تەفسیرا ساناهی بکە: FIB · QI Card · FastPay · ZainCash.'),
            '', 'page' => $this->simple($path, 'قورئانا پیروز دگەل تەفسیرا ساناهی ب کوردی', 'قورئانا پیروز (مسحەفا مەدینێ) دگەل تەفسیرا ساناهی ب کوردی ژ تەحسین ئیبراهیم دۆسکی — نڤیسین و دەنگ پێکڤە.'),
            'bookmarks', 'settings' => $this->simple($path, $path === 'settings' ? 'ڕێکخستن' : 'نیشانکری', 'قورئانا پیروز دگەل تەفسیرا ساناهی ب کوردی.'),
            default => $this->notFound(),
        };
    }

    private function surahPage(Surah $surah): array
    {
        $edition = $this->edition();
        $ayahs = $surah->ayahs()->with(['tafsirTexts' => fn ($q) => $q->where('tafsir_edition_id', $edition?->id)])->get();
        $place = $surah->revelation_place === 'madinah' ? 'مەدەنی' : 'مەککی';
        $items = $ayahs->map(fn (Ayah $a) => '<li><a href="/surah/'.$surah->id.'/'.$a->number.'"><p class="q">'.e($a->text_uthmani).' ﴿'.$this->ar($a->number).'﴾</p></a>'
            .'<p>'.e(Str::limit((string) $a->tafsirTexts->first()?->text, 220)).'</p></li>')->implode('');

        return [
            'title' => 'سورة '.$surah->name_ar.' · '.$surah->name_en.' — تەفسیر ب کوردی',
            'description' => 'سورەتا '.$surah->name_ar.' ('.$surah->name_en.')، '.$this->ar($surah->ayah_count).' ئایەت، '.$place.'. قورئانا پیروز دگەل تەفسیرا ساناهی ب کوردی — نڤیسین و دەنگ.',
            'path' => 'surah/'.$surah->id,
            'crumbs' => [['سورة '.$surah->name_ar, 'surah/'.$surah->id]],
            'body' => '<h1>سورة '.e($surah->name_ar).' <small>'.e($surah->name_en).'</small></h1>'
                .'<p>'.$this->ar($surah->ayah_count).' ئایەت · '.$place.'</p><ol>'.$items.'</ol>'
                .$this->nav($surah->id > 1 ? 'surah/'.($surah->id - 1) : null, $surah->id < 114 ? 'surah/'.($surah->id + 1) : null, 'سورەتا پێشتر', 'سورەتا پاشتر'),
        ];
    }

    private function ayahPage(Surah $surah, Ayah $ayah): array
    {
        $edition = $this->edition();
        $tafsir = (string) $ayah->tafsirTexts()->where('tafsir_edition_id', $edition?->id)->value('text');
        $label = 'سورة '.$surah->name_ar.' · ئایەت '.$this->ar($ayah->number);
        $prev = $ayah->number > 1 ? 'surah/'.$surah->id.'/'.($ayah->number - 1) : ($surah->id > 1 ? 'surah/'.($surah->id - 1) : null);
        $next = $ayah->number < $surah->ayah_count ? 'surah/'.$surah->id.'/'.($ayah->number + 1) : ($surah->id < 114 ? 'surah/'.($surah->id + 1).'/1' : null);

        return [
            'title' => $label.' ('.$surah->id.':'.$ayah->number.') — تەفسیرا ساناهی',
            'description' => Str::limit(trim(preg_replace('/\s+/u', ' ', $tafsir)) ?: $ayah->text_uthmani, 155),
            'path' => 'surah/'.$surah->id.'/'.$ayah->number,
            'crumbs' => [['سورة '.$surah->name_ar, 'surah/'.$surah->id], ['ئایەت '.$this->ar($ayah->number), 'surah/'.$surah->id.'/'.$ayah->number]],
            'body' => '<h1>'.e($label).'</h1><p class="q">'.e($ayah->text_uthmani).' ﴿'.$this->ar($ayah->number).'﴾</p>'
                .'<h2>تەفسیرا ساناهی</h2><p class="t">'.nl2br(e($tafsir)).'</p>'
                .$this->nav($prev, $next, 'ئایەتا پێشتر', 'ئایەتا پاشتر'),
        ];
    }

    private function mushafPage(int $n): array
    {
        $ayahs = Ayah::with('surah')->where('page', $n)->orderBy('id')->get();
        if ($ayahs->isEmpty()) {
            return $this->notFound();
        }
        $first = $ayahs->first();
        $names = $ayahs->pluck('surah.name_ar')->unique()->implode('، ');
        $items = $ayahs->map(fn (Ayah $a) => '<a href="/surah/'.$a->surah_id.'/'.$a->number.'">'.e($a->text_uthmani).' ﴿'.$this->ar($a->number).'﴾</a> ')->implode('');

        return [
            'title' => 'لاپەر '.$this->ar($n).' · سورة '.$names.' — قورئانا پیروز',
            'description' => 'لاپەرێ '.$this->ar($n).' ژ مسحەفا مەدینێ (سورة '.$names.'، الجزء '.$this->ar($first->juz).') دگەل تەفسیرا ساناهی ب کوردی.',
            'path' => 'page/'.$n,
            'crumbs' => [['لاپەر '.$this->ar($n), 'page/'.$n]],
            'body' => '<h1>لاپەر '.$this->ar($n).' · سورة '.e($names).'</h1><p class="q">'.$items.'</p>'
                .$this->nav($n > 1 ? 'page/'.($n - 1) : null, $n < 604 ? 'page/'.($n + 1) : null, 'لاپەرێ پێشتر', 'لاپەرێ پاشتر'),
        ];
    }

    private function simple(string $path, string $title, string $description): array
    {
        return ['title' => $title.' — '.self::SITE, 'description' => $description, 'path' => $path, 'body' => '<h1>'.e($title).'</h1><p>'.e($description).'</p>'];
    }

    /** Unknown paths still get the app (it shows the home screen), marked 404 for crawlers. */
    private function notFound(): array
    {
        return ['title' => self::SITE.' · Tefsira Sanahi', 'description' => '', 'path' => '', 'body' => '', 'status' => 404];
    }

    private function inject(string $html, array $page): string
    {
        $site = rtrim(config('tefsira.website'), '/');
        $url = $site.'/'.$page['path'];
        $t = e($page['title']);
        // Each pattern captures the text before the value it replaces.
        $replace = [
            '#(<title>)[^<]*#u' => $t,
            '#(<meta property="og:title" content=")[^"]*#u' => $t,
            '#(<link rel="canonical" href=")[^"]*#u' => e($url),
            '#(<meta property="og:url" content=")[^"]*#u' => e($url),
        ];
        if ($page['description'] !== '') {
            $d = e($page['description']);
            $replace['#(<meta name="description" content=")[^"]*#u'] = $d;
            $replace['#(<meta property="og:description" content=")[^"]*#u'] = $d;
        }
        foreach ($replace as $pattern => $value) {
            $html = preg_replace_callback($pattern, fn ($m) => $m[1].$value, $html, 1);
        }
        if (($page['status'] ?? 200) === 404) {
            $html = str_replace('</head>', '<meta name="robots" content="noindex" /></head>', $html);
        }

        if (! empty($page['crumbs'])) {
            $list = [['@type' => 'ListItem', 'position' => 1, 'name' => self::SITE, 'item' => $site.'/']];
            foreach ($page['crumbs'] as $i => [$name, $path]) {
                $list[] = ['@type' => 'ListItem', 'position' => $i + 2, 'name' => $name, 'item' => $site.'/'.$path];
            }
            $ld = json_encode(['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $list], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $html = str_replace('</head>', '<script type="application/ld+json">'.$ld.'</script></head>', $html);
        }
        if ($page['body'] !== '') {
            $body = '<main class="seo" dir="rtl"><nav><a href="/">'.self::SITE.'</a></nav>'.$page['body'].'</main>';
            $html = str_replace('<div id="root"></div>', '<div id="root">'.$body.'</div>', $html);
        }

        return $html;
    }

    private function nav(?string $prev, ?string $next, string $prevLabel, string $nextLabel): string
    {
        return '<nav>'.($prev ? '<a href="/'.$prev.'">'.$prevLabel.'</a> ' : '').($next ? '<a href="/'.$next.'">'.$nextLabel.'</a>' : '').'</nav>';
    }

    private function edition(): ?TafsirEdition
    {
        return TafsirEdition::where('slug', 'tehsin-duski-ku')->first();
    }

    private function ar(int $n): string
    {
        return strtr((string) $n, ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']);
    }
}
