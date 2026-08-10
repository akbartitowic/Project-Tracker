<?php

namespace App\Support;

use App\Models\Project;
use App\Models\ReviewEvaluation;
use App\Models\Setting;

class ReviewEmailTemplate
{
    public const KEY_SUBJECT = 'review_invite_email_subject';

    public const KEY_BODY = 'review_invite_email_body';

    public const DEFAULT_SUBJECT = 'Permintaan Review Project: {project_name}';

    public const DEFAULT_BODY = "Kami mengundang Anda untuk memberikan review/evaluasi atas project berikut: {project_name} ({evaluation_name}).\n\nSilakan klik tombol di bawah ini untuk mengisi review.";

    /** Placeholder tokens available for the admin-configured template. */
    public const PLACEHOLDERS = ['project_name', 'evaluation_name', 'app_name', 'review_url'];

    public static function subject(): string
    {
        $value = Setting::where('key', self::KEY_SUBJECT)->value('value');

        return $value !== null && $value !== '' ? $value : self::DEFAULT_SUBJECT;
    }

    public static function body(): string
    {
        $value = Setting::where('key', self::KEY_BODY)->value('value');

        return $value !== null && $value !== '' ? $value : self::DEFAULT_BODY;
    }

    /**
     * Render subject + body for a given project/evaluation, applying either the
     * caller-supplied override text or the stored/default template.
     *
     * @return array{subject: string, body: string}
     */
    public static function renderFor(
        Project $project,
        ReviewEvaluation $evaluation,
        ?string $reviewUrl,
        ?string $subjectOverride = null,
        ?string $bodyOverride = null,
    ): array {
        $vars = [
            'project_name' => $project->name,
            'evaluation_name' => $evaluation->name,
            'app_name' => AppBranding::appName(),
            'review_url' => $reviewUrl ?? '',
        ];

        $subjectTemplate = $subjectOverride !== null && $subjectOverride !== '' ? $subjectOverride : self::subject();
        $bodyTemplate = $bodyOverride !== null && $bodyOverride !== '' ? $bodyOverride : self::body();

        return [
            'subject' => self::apply($subjectTemplate, $vars),
            'body' => self::apply($bodyTemplate, $vars),
        ];
    }

    private static function apply(string $template, array $vars): string
    {
        $search = array_map(fn ($key) => '{' . $key . '}', array_keys($vars));

        return str_replace($search, array_values($vars), $template);
    }
}
