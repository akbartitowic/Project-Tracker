<?php

namespace App\Http\Controllers;

use App\Models\GlobalIntegration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GlobalIntegrationController extends Controller
{
    /**
     * GET /api/global-integrations — list all configurations.
     */
    public function index()
    {
        $configs = GlobalIntegration::orderBy('created_at')->get();
        return response()->json(['data' => $configs->map(fn($c) => $this->serialize($c))]);
    }

    /**
     * POST /api/global-integrations — create new named configuration.
     */
    public function store(Request $request)
    {
        $validated = $request->validate(['name' => 'required|string|max:100']);

        $config = GlobalIntegration::create([
            'name'            => trim($validated['name']),
            'inbound_api_key' => GlobalIntegration::generateApiKey(),
            'webhook_secret'  => GlobalIntegration::generateSecret(),
            'is_active'       => true,
        ]);

        return response()->json(['data' => $this->serialize($config)], 201);
    }

    /**
     * PUT /api/global-integrations/{id}
     */
    public function update(Request $request, int $id)
    {
        $config    = GlobalIntegration::findOrFail($id);
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'webhook_url' => 'nullable|url|max:2048',
            'is_active'   => 'sometimes|boolean',
        ]);

        if (isset($validated['name']))                     $config->name        = trim($validated['name']);
        if (array_key_exists('webhook_url', $validated))   $config->webhook_url = $validated['webhook_url'];
        if (isset($validated['is_active']))                $config->is_active   = $validated['is_active'];
        $config->save();

        return response()->json(['data' => $this->serialize($config)]);
    }

    /**
     * DELETE /api/global-integrations/{id}
     */
    public function destroy(int $id)
    {
        GlobalIntegration::findOrFail($id)->delete();
        return response()->json(['message' => 'Konfigurasi berhasil dihapus.']);
    }

    /**
     * POST /api/global-integrations/{id}/regenerate-key
     */
    public function regenerateKey(int $id)
    {
        $config               = GlobalIntegration::findOrFail($id);
        $config->inbound_api_key = GlobalIntegration::generateApiKey();
        $config->last_used_at    = null;
        $config->save();

        return response()->json(['data' => $this->serialize($config)]);
    }

    /**
     * POST /api/global-integrations/{id}/test
     */
    public function testWebhook(int $id)
    {
        $config = GlobalIntegration::findOrFail($id);

        if (!$config->webhook_url) {
            return response()->json(['message' => 'Webhook URL belum dikonfigurasi.'], 422);
        }

        $payload = [
            'event'     => 'test',
            'config'    => $config->name,
            'timestamp' => now()->toIso8601String(),
            'message'   => 'Test webhook from HubTask',
        ];
        $body    = json_encode($payload);
        $headers = ['Content-Type' => 'application/json', 'X-HubTask-Event' => 'test'];
        if ($config->webhook_secret) {
            $headers['X-Webhook-Signature'] = 'sha256=' . hash_hmac('sha256', $body, $config->webhook_secret);
        }

        try {
            $response = Http::withHeaders($headers)->timeout(5)->post($config->webhook_url, $payload);
            $success  = $response->successful();
            $config->webhook_test_sent_at = now();
            $config->webhook_test_status  = $success ? 'success' : 'failed';
            $config->saveQuietly();

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Webhook berhasil dikirim.' : 'Webhook dikirim tapi server merespons error.',
            ]);
        } catch (\Throwable $e) {
            $config->webhook_test_sent_at = now();
            $config->webhook_test_status  = 'failed';
            $config->saveQuietly();
            return response()->json(['success' => false, 'message' => 'Gagal: ' . $e->getMessage()], 502);
        }
    }

    // ── Legacy singleton (backward compat) ──
    public function show()
    {
        $config = GlobalIntegration::firstOrCreate(['id' => 1], [
            'name'            => 'Default',
            'inbound_api_key' => GlobalIntegration::generateApiKey(),
            'webhook_secret'  => GlobalIntegration::generateSecret(),
            'is_active'       => true,
        ]);
        return response()->json(['data' => $this->serialize($config)]);
    }

    private function serialize(GlobalIntegration $c): array
    {
        return [
            'id'                   => $c->id,
            'name'                 => $c->name,
            'inbound_api_key'      => $c->inbound_api_key,
            'webhook_url'          => $c->webhook_url,
            'webhook_secret'       => $c->webhook_secret,
            'is_active'            => $c->is_active,
            'last_used_at'         => $c->last_used_at?->toIso8601String(),
            'webhook_last_sent_at' => $c->webhook_last_sent_at?->toIso8601String(),
            'webhook_last_status'  => $c->webhook_last_status,
            'webhook_test_sent_at' => $c->webhook_test_sent_at?->toIso8601String(),
            'webhook_test_status'  => $c->webhook_test_status,
            'inbound_endpoint'     => url('/api/external/allocations'),
        ];
    }
}
