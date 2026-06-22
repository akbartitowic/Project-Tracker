<?php

namespace App\Services;

use App\Models\ProjectAllocation;
use App\Models\ProjectIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookDispatcher
{
    public function dispatch(string $event, ProjectAllocation $allocation): void
    {
        $integration = ProjectIntegration::where('project_id', $allocation->project_id)
            ->where('is_active', true)
            ->whereNotNull('webhook_url')
            ->first();

        if (!$integration) {
            return;
        }

        $payload = [
            'event'      => $event,
            'project_id' => $allocation->project_id,
            'timestamp'  => now()->toIso8601String(),
            'data'       => $this->serializeAllocation($allocation),
        ];

        $body    = json_encode($payload);
        $headers = [
            'Content-Type' => 'application/json',
            'X-HubTask-Event' => $event,
        ];

        if ($integration->webhook_secret) {
            $headers['X-Webhook-Signature'] = 'sha256=' . hash_hmac('sha256', $body, $integration->webhook_secret);
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(5)
                ->post($integration->webhook_url, $payload);

            $status = $response->successful() ? 'success' : 'failed';
        } catch (\Throwable $e) {
            Log::warning('Webhook dispatch failed', [
                'project_id'  => $allocation->project_id,
                'webhook_url' => $integration->webhook_url,
                'error'       => $e->getMessage(),
            ]);
            $status = 'failed';
        }

        $integration->webhook_last_sent_at = now();
        $integration->webhook_last_status  = $status;
        $integration->saveQuietly();
    }

    private function serializeAllocation(ProjectAllocation $a): array
    {
        $a->loadMissing('category');

        return [
            'id'              => $a->id,
            'project_id'      => $a->project_id,
            'category_id'     => $a->category_id,
            'category'        => $a->category?->name,
            'amount'          => (float) ($a->amount ?? 0),
            'description'     => $a->description,
            'is_topup'        => (bool) $a->is_topup,
            'realized_amount' => $a->realized_amount !== null ? (float) $a->realized_amount : null,
            'realized_at'     => $a->realized_at?->toDateString(),
            'paid_amount'     => $a->paid_amount !== null ? (float) $a->paid_amount : null,
            'paid_at'         => $a->paid_at?->toDateString(),
            'updated_at'      => $a->updated_at?->toIso8601String(),
        ];
    }
}
