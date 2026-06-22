<?php

namespace App\Http\Controllers;

use App\Models\GlobalIntegration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GlobalIntegrationController extends Controller
{
    public function show(Request $request)
    {
        $integration = GlobalIntegration::instance();
        return response()->json(['data' => $this->serialize($integration)]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'webhook_url' => 'nullable|url|max:2048',
            'is_active'   => 'sometimes|boolean',
        ]);

        $integration = GlobalIntegration::instance();

        if (array_key_exists('webhook_url', $validated)) {
            $integration->webhook_url = $validated['webhook_url'];
        }
        if (array_key_exists('is_active', $validated)) {
            $integration->is_active = $validated['is_active'];
        }
        $integration->save();

        return response()->json(['data' => $this->serialize($integration)]);
    }

    public function regenerateKey(Request $request)
    {
        $integration = GlobalIntegration::instance();
        $integration->inbound_api_key = GlobalIntegration::generateApiKey();
        $integration->save();

        return response()->json(['data' => $this->serialize($integration)]);
    }

    public function testWebhook(Request $request)
    {
        $integration = GlobalIntegration::instance();

        if (!$integration->webhook_url) {
            return response()->json(['message' => 'Webhook URL belum dikonfigurasi.'], 422);
        }

        $payload = [
            'event'     => 'test',
            'scope'     => 'global',
            'timestamp' => now()->toIso8601String(),
            'message'   => 'Test webhook from HubTask (global)',
        ];

        $body    = json_encode($payload);
        $headers = ['Content-Type' => 'application/json', 'X-HubTask-Event' => 'test'];

        if ($integration->webhook_secret) {
            $headers['X-Webhook-Signature'] = 'sha256=' . hash_hmac('sha256', $body, $integration->webhook_secret);
        }

        try {
            $response = Http::withHeaders($headers)->timeout(5)->post($integration->webhook_url, $payload);
            $success  = $response->successful();

            $integration->webhook_test_sent_at = now();
            $integration->webhook_test_status  = $success ? 'success' : 'failed';
            $integration->saveQuietly();

            return response()->json([
                'success'     => $success,
                'status_code' => $response->status(),
                'message'     => $success ? 'Webhook berhasil dikirim.' : 'Server tujuan merespons error.',
            ]);
        } catch (\Throwable $e) {
            $integration->webhook_test_sent_at = now();
            $integration->webhook_test_status  = 'failed';
            $integration->saveQuietly();

            return response()->json(['success' => false, 'message' => 'Gagal: ' . $e->getMessage()], 502);
        }
    }

    private function serialize(GlobalIntegration $i): array
    {
        return [
            'inbound_api_key'      => $i->inbound_api_key,
            'webhook_url'          => $i->webhook_url,
            'webhook_secret'       => $i->webhook_secret,
            'is_active'            => $i->is_active,
            'webhook_last_sent_at' => $i->webhook_last_sent_at?->toIso8601String(),
            'webhook_last_status'  => $i->webhook_last_status,
            'webhook_test_sent_at' => $i->webhook_test_sent_at?->toIso8601String(),
            'webhook_test_status'  => $i->webhook_test_status,
            'inbound_endpoint'     => url('/api/external/allocations'),
        ];
    }
}
