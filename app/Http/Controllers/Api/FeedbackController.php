<?php

namespace App\Http\Controllers\Api;

use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Feedback from the website and the apps. Anyone may send (rate limited);
 * reading and handling it needs the admin token (the dashboard).
 */
class FeedbackController extends ApiController
{
    public function store(Request $request): JsonResponse
    {
        // A field people never see: bots fill it, people don't.
        if (filled($request->input('website'))) {
            return response()->json(['data' => ['received' => true]], 201);
        }

        $data = $request->validate([
            'kind' => ['required', Rule::in(Feedback::KINDS)],
            'message' => ['required', 'string', 'min:3', 'max:5000'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'contact' => ['nullable', 'string', 'max:190'],
            'ayah_key' => ['nullable', 'string', 'regex:/^\d{1,3}:\d{1,3}$/'],
            'platform' => ['required', Rule::in(Feedback::PLATFORMS)],
            'app_version' => ['nullable', 'string', 'max:40'],
            'page' => ['nullable', 'string', 'max:255'],
        ]);

        $feedback = Feedback::create([...$data, 'message' => trim($data['message']), 'status' => 'new']);

        return response()->json(['data' => ['id' => $feedback->id, 'received' => true]], 201);
    }

    /** ?status=new|seen|done, ?kind=…; newest first, 50 per page. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::in(Feedback::STATUSES)],
            'kind' => ['nullable', Rule::in(Feedback::KINDS)],
        ]);
        $page = Feedback::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('kind'), fn ($q, $k) => $q->where('kind', $k))
            ->latest('id')
            ->paginate(50);

        return response()->json([
            'data' => collect($page->items())->map->toApi()->all(),
            'meta' => [
                'total' => $page->total(),
                'page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'counts' => Feedback::query()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status'),
            ],
        ]);
    }

    public function update(Request $request, Feedback $feedback): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Feedback::STATUSES)],
            'note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);
        $feedback->update($data);

        return response()->json(['data' => $feedback->toApi()]);
    }

    public function destroy(Feedback $feedback): JsonResponse
    {
        $feedback->delete();

        return response()->json(null, 204);
    }
}
