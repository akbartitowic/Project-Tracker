<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanupLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logs:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove activity logs older than 3 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Cleaning up old activity logs...');
        $controller = new \App\Http\Controllers\ActivityLogController();
        $response = $controller->cleanup();
        $this->info($response->getData()->message);
    }
}
