<?php

namespace App\Console\Commands;

use App\Jobs\SyncSubscriptionMetering;
use Illuminate\Console\Command;

class SyncMeteringCommand extends Command
{
    protected $signature = 'billing:sync-metering';

    protected $description = 'Sync active devices to subscription items for all active subscriptions';

    public function handle(): int
    {
        $this->info('Dispatching metering sync...');
        SyncSubscriptionMetering::dispatch();
        $this->info('Done.');

        return self::SUCCESS;
    }
}
