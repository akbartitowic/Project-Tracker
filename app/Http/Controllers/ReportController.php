<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Task;
use App\Models\Manhour;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    public function generate(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'range' => 'required|in:weekly,biweekly,monthly',
            'preview' => 'nullable|boolean'
        ]);

        $data = $this->getReportData($request->project_id, $request->range);
        $pdf = Pdf::loadView('reports.project_report', $data);

        if ($request->preview) {
            return $pdf->stream("Report-{$data['project']->name}-{$data['range']}.pdf");
        }

        return $pdf->download("Report-{$data['project']->name}-{$data['range']}.pdf");
    }

    public function sendEmail(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'range' => 'required|in:weekly,biweekly,monthly',
            'emails' => 'required|string', // Comma separated
            'subject' => 'required|string|max:255',
            'body' => 'required|string'
        ]);

        $data = $this->getReportData($request->project_id, $request->range);
        $pdf = Pdf::loadView('reports.project_report', $data);
        $pdfContent = $pdf->output();

        // 2. Set SMTP Configuration from Database
        $this->applyMailSettings();

        // 3. Send Email
        $emails = array_map('trim', explode(',', $request->emails));
        $subject = $request->subject;
        $body = $request->body;
        $fileName = "Report-{$data['project']->name}-{$data['range']}.pdf";

        try {
            Mail::raw($body, function ($message) use ($emails, $subject, $pdfContent, $fileName) {
                $message->to($emails)
                    ->subject($subject)
                    ->attachData($pdfContent, $fileName, [
                        'mime' => 'application/pdf',
                    ]);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Report sent successfully to ' . count($emails) . ' recipients.'
            ]);
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send email: ' . $e->getMessage()
            ], 500);
        }
    }

    private function getReportData($projectId, $range)
    {
        $project = Project::findOrFail($projectId);
        $endDate = Carbon::now();
        $startDate = match ($range) {
            'weekly' => Carbon::now()->subWeek(),
            'biweekly' => Carbon::now()->subWeeks(2),
            'monthly' => Carbon::now()->subMonth(),
            default => Carbon::now()->subWeek(),
        };

        // 1. Task List Worked on in Range (Updated in the range)
        $tasksInRange = Task::where('project_id', $project->id)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->get();

        // 2. Tasks currently in progress (In Progress or Re-open)
        $inProgressTasks = Task::where('project_id', $project->id)
            ->whereIn('status', ['In Progress', 'Re-open'])
            ->get();

        // 3. Scrum Manhours
        $stats = [
            'used_in_range' => Manhour::where('project_id', $project->id)
                ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                ->sum('hours'),
            'total_used' => Manhour::where('project_id', $project->id)->sum('hours'),
            'total_quota' => $project->total_manhours,
            'remaining' => ($project->total_manhours ?? 0) - Manhour::where('project_id', $project->id)->sum('hours')
        ];

        // 4. Category Progress Breakdown
        $categories = ['Analisa', 'Desain', 'Development', 'Testing', 'Production'];
        $statuses = ['To Do', 'In Progress', 'Review', 'Done'];
        $categoryProgress = [];

        foreach ($categories as $cat) {
            $totalCatTasks = Task::where('project_id', $project->id)->where('category', $cat)->count();
            $catStats = [];
            foreach ($statuses as $stat) {
                $query = Task::where('project_id', $project->id)->where('category', $cat);
                if ($stat === 'In Progress') {
                    $query->whereIn('status', ['In Progress', 'Re-open']);
                } else {
                    $query->where('status', $stat);
                }
                $count = $query->count();
                $catStats[$stat] = $totalCatTasks > 0 ? round(($count / $totalCatTasks) * 100) : 0;
            }
            $categoryProgress[$cat] = [
                'stats' => $catStats,
                'total' => $totalCatTasks
            ];
        }

        return [
            'project' => $project,
            'range' => $range,
            'startDate' => $startDate->format('d M Y'),
            'endDate' => $endDate->format('d M Y'),
            'tasksInRange' => $tasksInRange,
            'inProgressTasks' => $inProgressTasks,
            'stats' => $stats,
            'categoryProgress' => $categoryProgress
        ];
    }

    private function applyMailSettings()
    {
        $settings = Setting::whereIn('key', [
            'mail_host', 'mail_port', 'mail_username', 'mail_password', 
            'mail_encryption', 'mail_from_address', 'mail_from_name'
        ])->get()->pluck('value', 'key');

        if ($settings->has('mail_host')) {
            // Force the default mailer to smtp and transport to smtp
            Config::set('mail.default', 'smtp');
            Config::set('mail.mailers.smtp.transport', 'smtp');
            
            Config::set('mail.mailers.smtp.host', $settings['mail_host']);
            Config::set('mail.mailers.smtp.port', $settings['mail_port']);
            Config::set('mail.mailers.smtp.username', $settings['mail_username']);
            Config::set('mail.mailers.smtp.password', $settings['mail_password']);
            Config::set('mail.mailers.smtp.encryption', $settings['mail_encryption']);
            
            Config::set('mail.from.address', $settings['mail_from_address']);
            Config::set('mail.from.name', $settings['mail_from_name']);

            // Purge the SMTP mailer to ensure it re-reads the configuration
            Mail::purge('smtp');
        }
    }

    public function getProjects()
    {
        return response()->json(['data' => Project::all()]);
    }
}
