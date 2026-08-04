<?php

namespace App\Notifications;

use App\Mail\ManhourThresholdMail;
use App\Models\Project;
use Illuminate\Notifications\Notification;

class ManhourThresholdNotification extends Notification
{
    /**
     * @param  array<string, mixed>  $bucket  a single top-up bucket from ManhourBucketCalculator::build()
     */
    public function __construct(
        public Project $project,
        public int $projectRoleId,
        public string $roleName,
        public array $bucket,
        public int $threshold,
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->email && $notifiable->task_email_notifications_enabled) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'mh_topup_threshold',
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'project_role_id' => $this->projectRoleId,
            'role_name' => $this->roleName,
            'threshold' => $this->threshold,
            'consumed_pct' => $this->bucket['consumed_pct'] ?? null,
            'consumed_hours' => $this->bucket['consumed_hours'] ?? null,
            'quota_hours' => $this->bucket['quota_hours'] ?? null,
            'topup_label' => $this->bucket['label'] ?? null,
            'topup_description' => $this->bucket['description'] ?? null,
        ];
    }

    public function toMail(object $notifiable): ManhourThresholdMail
    {
        $boardUrl = url('/board/' . $this->project->id . '/dashboard');

        return (new ManhourThresholdMail($this->project, $this->roleName, $this->bucket, $this->threshold, $boardUrl))
            ->to($notifiable->email);
    }
}
