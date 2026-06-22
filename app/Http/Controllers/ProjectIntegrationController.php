<?php

namespace App\Http\Controllers;

use App\Models\ProjectIntegration;
use App\Support\ProjectAccess;
use Illuminate\Http\Request;

class ProjectIntegrationController extends Controller
{
    /**
     * GET /api/projects/{id}/integration
     * Get or auto-create integration settings for a project.
     */
    public function show(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $integration = ProjectIntegration::firstOrCreate(
            ['project_id' => $id],
            [
                'inbound_api_key' => ProjectIntegration::generateApiKey(),
                'webhook_secret'  => ProjectIntegration::generateSecret(),
                'is_active'       => true,
            ]
        );

        return response()->json(['data' => $this->serialize($integration, $id)]);
    }

    /**
     * PUT /api/projects/{id}/integration
     * Update webhook URL or toggle active state.
     */
    public function update(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $validated = $request->validate([
            'webhook_url' => 'nullable|url|max:2048',
            'is_active'   => 'sometimes|boolean',
        ]);

        $integration = ProjectIntegration::firstOrCreate(
            ['project_id' => $id],
            [
                'inbound_api_key' => ProjectIntegration::generateApiKey(),
                'webhook_secret'  => ProjectIntegration::generateSecret(),
                'is_active'       => true,
            ]
        );

        if (array_key_exists('webhook_url', $validated)) {
            $integration->webhook_url = $validated['webhook_url'];
        }
        if (array_key_exists('is_active', $validated)) {
            $integration->is_active = $validated['is_active'];
        }
        $integration->save();

        return response()->json(['data' => $this->serialize($integration, $id)]);
    }

    /**
     * POST /api/projects/{id}/integration/regenerate-key
     * Regenerate the inbound API key (invalidates the old one).
     */
    public function regenerateKey(Request $request, int $id)
    {
        ProjectAccess::assertCanAccessProject($request->user(), $id);

        $integration = ProjectIntegration::firstOrCreate(
            ['project_id' => $id],
            [
                'inbound_api_key' => ProjectIntegration::generateApiKey(),
                'webhook_secret'  => ProjectIntegration::generateSecret(),
                'is_active'       => true,
            ]
        );

        $integration->inbound_api_key = ProjectIntegration::generateApiKey();
        $integration->save();

        return response()->json(['data' => $this->serialize($integration, $id)]);
    }

    private function serialize(ProjectIntegration $i, int $projectId): array
    {
        return [
            'project_id'            => $projectId,
            'inbound_api_key'       => $i->inbound_api_key,
            'webhook_url'           => $i->webhook_url,
            'webhook_secret'        => $i->webhook_secret,
            'is_active'             => $i->is_active,
            'webhook_last_sent_at'  => $i->webhook_last_sent_at?->toIso8601String(),
            'webhook_last_status'   => $i->webhook_last_status,
            'inbound_endpoint'      => url('/api/external/allocations'),
        ];
    }
}
