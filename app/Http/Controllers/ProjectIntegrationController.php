<?php

namespace App\Http\Controllers;

use App\Models\ProjectIntegration;
use App\Support\ProjectAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProjectIntegrationController extends Controller
{
    /**
     * GET /api/projects/{id}/integrations
     * List all connections for a project.
     */
    public function index(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connections = ProjectIntegration::where('project_id', $id)
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => $connections->map(fn($c) => $this->serialize($c)),
        ]);
    }

    /**
     * POST /api/projects/{id}/integrations
     * Create a new named connection.
     */
    public function store(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $validated = $request->validate([
            'connection_name' => 'required|string|max:100',
        ]);

        $connection = ProjectIntegration::create([
            'project_id'      => $id,
            'connection_name' => trim($validated['connection_name']),
            'inbound_api_key' => ProjectIntegration::generateApiKey(),
            'webhook_secret'  => ProjectIntegration::generateSecret(),
            'is_active'       => true,
        ]);

        return response()->json(['data' => $this->serialize($connection)], 201);
    }

    /**
     * PUT /api/projects/{id}/integrations/{cid}
     * Update webhook URL or toggle active state.
     */
    public function update(Request $request, int $id, int $cid)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connection = ProjectIntegration::where('id', $cid)
            ->where('project_id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'connection_name' => 'sometimes|string|max:100',
            'webhook_url'     => 'nullable|url|max:2048',
            'is_active'       => 'sometimes|boolean',
        ]);

        if (isset($validated['connection_name'])) {
            $connection->connection_name = trim($validated['connection_name']);
        }
        if (array_key_exists('webhook_url', $validated)) {
            $connection->webhook_url = $validated['webhook_url'];
        }
        if (isset($validated['is_active'])) {
            $connection->is_active = $validated['is_active'];
        }
        $connection->save();

        return response()->json(['data' => $this->serialize($connection)]);
    }

    /**
     * DELETE /api/projects/{id}/integrations/{cid}
     */
    public function destroy(Request $request, int $id, int $cid)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connection = ProjectIntegration::where('id', $cid)
            ->where('project_id', $id)
            ->firstOrFail();

        $connection->delete();

        return response()->json(['message' => 'Koneksi berhasil dihapus.']);
    }

    /**
     * POST /api/projects/{id}/integrations/{cid}/regenerate-key
     */
    public function regenerateKey(Request $request, int $id, int $cid)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connection = ProjectIntegration::where('id', $cid)
            ->where('project_id', $id)
            ->firstOrFail();

        $connection->inbound_api_key = ProjectIntegration::generateApiKey();
        $connection->last_used_at    = null;
        $connection->save();

        return response()->json(['data' => $this->serialize($connection)]);
    }

    /**
     * POST /api/projects/{id}/integrations/{cid}/test
     */
    public function testWebhook(Request $request, int $id, int $cid)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connection = ProjectIntegration::where('id', $cid)
            ->where('project_id', $id)
            ->firstOrFail();

        if (!$connection->webhook_url) {
            return response()->json(['message' => 'Webhook URL belum dikonfigurasi.'], 422);
        }

        $payload = [
            'event'           => 'test',
            'project_id'      => $id,
            'connection_name' => $connection->connection_name,
            'timestamp'       => now()->toIso8601String(),
            'message'         => 'Test webhook from HubTask',
        ];

        $body    = json_encode($payload);
        $headers = ['Content-Type' => 'application/json', 'X-HubTask-Event' => 'test'];

        if ($connection->webhook_secret) {
            $headers['X-Webhook-Signature'] = 'sha256=' . hash_hmac('sha256', $body, $connection->webhook_secret);
        }

        try {
            $response = Http::withHeaders($headers)->timeout(5)->post($connection->webhook_url, $payload);
            $success  = $response->successful();

            $connection->webhook_test_sent_at = now();
            $connection->webhook_test_status  = $success ? 'success' : 'failed';
            $connection->saveQuietly();

            return response()->json([
                'success'     => $success,
                'status_code' => $response->status(),
                'message'     => $success ? 'Webhook berhasil dikirim.' : 'Webhook dikirim tapi server tujuan merespons error.',
            ]);
        } catch (\Throwable $e) {
            $connection->webhook_test_sent_at = now();
            $connection->webhook_test_status  = 'failed';
            $connection->saveQuietly();

            return response()->json(['success' => false, 'message' => 'Gagal mengirim webhook: ' . $e->getMessage()], 502);
        }
    }

    // ── Legacy single-connection endpoints (backward compat) ──

    public function show(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $connection = ProjectIntegration::firstOrCreate(
            ['project_id' => $id],
            [
                'connection_name' => 'Default',
                'inbound_api_key' => ProjectIntegration::generateApiKey(),
                'webhook_secret'  => ProjectIntegration::generateSecret(),
                'is_active'       => true,
            ]
        );

        return response()->json(['data' => $this->serialize($connection)]);
    }

    private function serialize(ProjectIntegration $c): array
    {
        return [
            'id'                    => $c->id,
            'project_id'            => $c->project_id,
            'connection_name'       => $c->connection_name,
            'inbound_api_key'       => $c->inbound_api_key,
            'webhook_url'           => $c->webhook_url,
            'webhook_secret'        => $c->webhook_secret,
            'is_active'             => $c->is_active,
            'last_used_at'          => $c->last_used_at?->toIso8601String(),
            'webhook_last_sent_at'  => $c->webhook_last_sent_at?->toIso8601String(),
            'webhook_last_status'   => $c->webhook_last_status,
            'webhook_test_sent_at'  => $c->webhook_test_sent_at?->toIso8601String(),
            'webhook_test_status'   => $c->webhook_test_status,
            'inbound_endpoint'      => url('/api/external/allocations'),
            'created_at'            => $c->created_at?->toIso8601String(),
        ];
    }
}
