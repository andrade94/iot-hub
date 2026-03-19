<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MarkOverdueInvoicesCommand extends Command
{
    protected $signature = 'billing:mark-overdue
                            {--dry-run : Show what would be marked without updating}';

    protected $description = 'Mark sent invoices as overdue when their period has passed';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        // An invoice is overdue if it's in 'sent' status and we're past the end of its period month
        $invoices = Invoice::where('status', 'sent')
            ->with('organization')
            ->get()
            ->filter(function (Invoice $invoice) {
                $periodEnd = Carbon::createFromFormat('Y-m', $invoice->period)->endOfMonth();

                return now()->greaterThan($periodEnd);
            });

        if ($invoices->isEmpty()) {
            $this->info('No overdue invoices found.');

            return self::SUCCESS;
        }

        $this->info("Found {$invoices->count()} overdue invoice(s).");

        if ($dryRun) {
            $this->warn('DRY RUN — no invoices will be updated.');
        }

        $updated = 0;

        foreach ($invoices as $invoice) {
            $orgName = $invoice->organization?->name ?? 'Unknown';

            if ($dryRun) {
                $this->line("  → {$orgName} — Invoice #{$invoice->id} (period: {$invoice->period})");
            } else {
                $invoice->update(['status' => 'overdue']);
                $this->line("  ✓ {$orgName} — Invoice #{$invoice->id} marked overdue");
            }

            $updated++;
        }

        $this->newLine();
        $this->info("Marked overdue: {$updated}");

        return self::SUCCESS;
    }
}
