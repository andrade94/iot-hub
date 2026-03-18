<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\Billing\InvoiceService;
use Illuminate\Console\Command;

class GenerateInvoicesCommand extends Command
{
    protected $signature = 'billing:generate-invoices
                            {--period= : Billing period in YYYY-MM format (defaults to current month)}
                            {--org= : Generate for a specific organization ID only}
                            {--dry-run : Show what would be generated without creating invoices}';

    protected $description = 'Generate monthly invoices for all active subscriptions';

    public function handle(InvoiceService $invoiceService): int
    {
        $period = $this->option('period') ?? now()->format('Y-m');
        $orgId = $this->option('org');
        $dryRun = $this->option('dry-run');

        $query = Subscription::where('status', 'active')
            ->with(['billingProfile.organization', 'items']);

        if ($orgId) {
            $query->whereHas('billingProfile', fn ($q) => $q->where('org_id', $orgId));
        }

        $subscriptions = $query->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No active subscriptions found.');

            return self::SUCCESS;
        }

        $this->info("Generating invoices for period: {$period}");
        $this->info("Found {$subscriptions->count()} active subscription(s).");

        if ($dryRun) {
            $this->warn('DRY RUN — no invoices will be created.');
        }

        $generated = 0;
        $skipped = 0;

        foreach ($subscriptions as $subscription) {
            $orgName = $subscription->billingProfile?->organization?->name ?? 'Unknown';

            // Skip if invoice already exists for this period
            $existing = \App\Models\Invoice::where('org_id', $subscription->billingProfile?->org_id)
                ->where('billing_profile_id', $subscription->billing_profile_id)
                ->where('period', $period)
                ->exists();
            if ($existing) {
                $this->line("  ⊘ {$orgName} — already invoiced for {$period}");
                $skipped++;

                continue;
            }

            $total = $subscription->calculateMonthlyTotal();

            if ($dryRun) {
                $this->line("  → {$orgName} — \${$total} MXN (would generate)");
                $generated++;

                continue;
            }

            $invoice = $invoiceService->generateInvoice($subscription, $period);
            $this->line("  ✓ {$orgName} — Invoice #{$invoice->id} — \${$invoice->total} MXN");
            $generated++;
        }

        $this->newLine();
        $this->info("Generated: {$generated} | Skipped: {$skipped}");

        return self::SUCCESS;
    }
}
