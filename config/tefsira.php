<?php

return [

    /*
    | API release. Shown by GET /api/v1 and sent in the X-API-Version header.
    */
    'version' => '1.0.0',

    /*
    | The Tefsira Sanahi website (the web app) and the source code.
    */
    'website' => env('TEFSIRA_WEBSITE', 'https://tafsirasanahi.com'),
    'github' => 'https://github.com/azadlinavay/tefsira-sanahi-api',

    /*
    | Bearer token for the admin endpoints (uploading or correcting tafsir
    | text and audio). Leave empty to turn the admin endpoints off.
    */
    'admin_token' => env('TEFSIRA_ADMIN_TOKEN'),

    /*
    | Storage for tafsir audio clips and for the downloadable packages.
    | "public" keeps files on this server (php artisan storage:link);
    | "s3" uses any S3-compatible storage such as Cloudflare R2.
    */
    'audio_disk' => env('TEFSIRA_AUDIO_DISK', 'public'),
    'packages_disk' => env('TEFSIRA_PACKAGES_DISK', 'public'),

    /*
    | Requests per minute per IP on the public API, and how long clients and
    | CDNs may cache read responses (seconds).
    */
    'rate_limit' => env('TEFSIRA_RATE_LIMIT', 120),
    'cache_seconds' => env('TEFSIRA_CACHE_SECONDS', 3600),

    /*
    | Donations to the app.
    */
    'donation' => [
        'phone' => '+964 750 760 1194',
        'website' => env('TEFSIRA_WEBSITE', 'https://tafsirasanahi.com'),
        'phone_e164' => '+9647507601194',
        'methods' => [
            ['id' => 'fib', 'name' => 'FIB (First Iraqi Bank)'],
            ['id' => 'qi-card', 'name' => 'QI Card'],
            ['id' => 'fastpay', 'name' => 'FastPay'],
            ['id' => 'zaincash', 'name' => 'ZainCash'],
        ],
        'message' => [
            'ku' => 'ئەگەر تە دڤێت پشتەڤانیا ئەپلیکەیشنا تەفسیرا ساناهی بکەی، دشێی پەیوەندیێ ب مە بکەی ل سەر ڤی ژمارێ ب ڕێکا FIB، QI Card، FastPay یان ZainCash.',
            'en' => 'To support the Tefsira Sanahi app, contact us on this number via FIB, QI Card, FastPay or ZainCash.',
            'ar' => 'لدعم تطبيق تفسيرا ساناهي، تواصلوا معنا على هذا الرقم عبر FIB أو QI Card أو FastPay أو ZainCash.',
        ],
    ],

];
