<!DOCTYPE html>
<html>
<head>
    <title>Project Report - {{ $project->name }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.5; padding: 20px; }
        .header { border-bottom: 2px solid #135cec; padding-bottom: 15px; margin-bottom: 30px; }
        .header h1 { color: #135cec; margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
        
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #135cec; padding-left: 10px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background-color: #f8fafc; color: #64748b; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #e2e8f0; text-transform: uppercase; }
        td { padding: 10px; border: 1px solid #e2e8f0; vertical-align: top; }
        
        .stats-grid { display: block; width: 100%; margin-bottom: 30px; }
        .stat-box { display: inline-block; width: 30%; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background-color: #fff; margin-right: 2%; }
        .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
        .stat-value { font-size: 20px; font-weight: bold; color: #135cec; }
        
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .badge-todo { background-color: #f1f5f9; color: #475569; }
        .badge-progress { background-color: #eff6ff; color: #1d4ed8; }
        .badge-reopen { background-color: #fff1f2; color: #e11d48; }
        .badge-done { background-color: #f0fdf4; color: #15803d; }
        
        .progress-bar-container { background-color: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; margin-top: 5px; border: 1px solid #e2e8f0; }
        .progress-bar { height: 100%; display: block; border-radius: 6px; }
        
        /* New Progress Colors */
        .pb-low { background-color: #e11d48; }    /* Rose 600 */
        .pb-mid { background-color: #f59e0b; }    /* Amber 500 */
        .pb-high { background-color: #10b981; }   /* Emerald 500 */

        .cat-row { margin-bottom: 20px; padding: 12px; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
        .cat-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; display: inline-block; color: #1e293b; }
        .cat-perc-text { font-size: 12px; font-weight: bold; color: #1e293b; float: right; }
        .cat-subtitle { font-size: 10px; color: #64748b; margin-bottom: 8px; }

        .footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $project->name }}</h1>
        <p>Project Report | Range: <strong>{{ ucfirst($range) }}</strong> ({{ $startDate }} - {{ $endDate }})</p>
    </div>

    @if($project->methodology === 'Agile Scrum')
    <div class="section">
        <div class="section-title">Man-hour Statistics</div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Used In Range</div>
                <div class="stat-value">{{ number_format($stats['used_in_range'], 1) }}h</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Total Used</div>
                <div class="stat-value">{{ number_format($stats['total_used'], 1) }}h</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Remaining / Quota</div>
                <div class="stat-value">{{ number_format($stats['remaining'], 1) }}h / {{ number_format($stats['total_quota'] ?? 0, 1) }}h</div>
            </div>
        </div>
    </div>
    @endif

    <div class="section">
        <div class="section-title">Category Progress Breakdown</div>
        <div style="margin-bottom: 15px; font-size: 9px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 6px;">
            <strong>Status Progress:</strong> To Do (0%) | In Progress (25%) | Re-open (50%) | Review (75%) | Done (100%)
        </div>
        
        @foreach($categoryProgress as $cat => $p)
        <div class="cat-row">
            <div>
                <span class="cat-name">{{ $cat }}</span>
                <span class="cat-perc-text">{{ $p['weighted_total'] }}% Progress</span>
            </div>
            <div class="cat-subtitle">
                Total Tasks: {{ $p['total'] }} (
                Done: {{ $p['counts']['Done'] }} | 
                Review: {{ $p['counts']['Review'] }} | 
                In Progress: {{ $p['counts']['In Progress'] + $p['counts']['Re-open'] }} | 
                To Do: {{ $p['counts']['To Do'] }}
                )
            </div>
            <div class="progress-bar-container">
                @php
                    $colorClass = $p['weighted_total'] < 30 ? 'pb-low' : ($p['weighted_total'] < 70 ? 'pb-mid' : 'pb-high');
                @endphp
                <div class="progress-bar {{ $colorClass }}" style="width: {{ $p['weighted_total'] }}%"></div>
            </div>
        </div>
        @endforeach
    </div>

    <div class="section">
        <div class="section-title">Tasks Updated in Range</div>
        <table>
            <thead>
                <tr>
                    <th width="40%">Task</th>
                    <th width="20%">Feature</th>
                    <th width="20%">Status</th>
                    <th width="20%">Last Update</th>
                </tr>
            </thead>
            <tbody>
                @forelse($tasksInRange as $task)
                <tr>
                    <td><strong>{{ $task->title }}</strong></td>
                    <td>{{ $task->feature_title ?: '-' }}</td>
                    <td>
                        <span class="badge {{ 
                            $task->status === 'Done' ? 'badge-done' : 
                            ($task->status === 'In Progress' ? 'badge-progress' : 
                            ($task->status === 'Re-open' ? 'badge-reopen' : 'badge-todo')) 
                        }}">
                            {{ $task->status }}
                        </span>
                    </td>
                    <td>{{ $task->updated_at->format('d M Y') }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" style="text-align: center; color: #94a3b8;">No tasks updated in this range.</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if($inProgressTasks->count() > 0)
    <div class="section">
        <div class="section-title">Current Tasks (InProgress/ReOpen)</div>
        <table>
            <thead>
                <tr>
                    <th width="{{ $project->methodology === 'Agile Scrum' ? '40%' : '50%' }}">Task</th>
                    <th width="{{ $project->methodology === 'Agile Scrum' ? '20%' : '25%' }}">Status</th>
                    <th width="{{ $project->methodology === 'Agile Scrum' ? '20%' : '25%' }}">Feature</th>
                    @if($project->methodology === 'Agile Scrum')
                    <th width="20%">Est. Manhours</th>
                    @endif
                </tr>
            </thead>
            <tbody>
                @foreach($inProgressTasks as $task)
                <tr>
                    <td><strong>{{ $task->title }}</strong></td>
                    <td>
                        <span class="badge {{ $task->status === 'Re-open' ? 'badge-reopen' : 'badge-progress' }}">
                            {{ $task->status }}
                        </span>
                    </td>
                    <td>{{ $task->feature_title ?: '-' }}</td>
                    @if($project->methodology === 'Agile Scrum')
                    <td>{{ number_format($task->estimated_hours, 1) }}h</td>
                    @endif
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <div class="footer">
        Generated by Noohtify Software Management System on {{ date('d M Y H:i') }}
    </div>
</body>
</html>
