<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\WorkOrder;
use App\Services\Billing\InvoiceService;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

// ── SM-001 Alert State Machine ───────────────────────────────────────────

describe('SM-001 Alert', function () {
    beforeEach(function () {
        $device = createDevice($this->site);

        $this->rule = AlertRule::create([
            'site_id' => $this->site->id,
            'device_id' => $device->id,
            'name' => 'Test Rule',
            'type' => 'threshold',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 30]],
            'severity' => 'warning',
            'cooldown_minutes' => 15,
            'active' => true,
        ]);

        $this->device = $device;
    });

    function createAlert(string $status, object $context): Alert
    {
        return Alert::create([
            'rule_id' => $context->rule->id,
            'site_id' => $context->site->id,
            'device_id' => $context->device->id,
            'severity' => 'warning',
            'status' => $status,
            'triggered_at' => now(),
            'data' => ['metric' => 'temperature', 'value' => 35, 'threshold' => 30],
        ]);
    }

    it('allows active → acknowledged', function () {
        $alert = createAlert('active', $this);
        expect($alert->canTransitionTo('acknowledged'))->toBeTrue();
        $alert->acknowledge(1);
        expect($alert->fresh()->status)->toBe('acknowledged');
    });

    it('allows active → resolved', function () {
        $alert = createAlert('active', $this);
        expect($alert->canTransitionTo('resolved'))->toBeTrue();
        $alert->resolve(1);
        expect($alert->fresh()->status)->toBe('resolved');
    });

    it('allows active → dismissed', function () {
        $alert = createAlert('active', $this);
        expect($alert->canTransitionTo('dismissed'))->toBeTrue();
        $alert->dismiss(1);
        expect($alert->fresh()->status)->toBe('dismissed');
    });

    it('allows acknowledged → resolved', function () {
        $alert = createAlert('acknowledged', $this);
        expect($alert->canTransitionTo('resolved'))->toBeTrue();
        $alert->resolve(1);
        expect($alert->fresh()->status)->toBe('resolved');
    });

    it('allows acknowledged → dismissed', function () {
        $alert = createAlert('acknowledged', $this);
        expect($alert->canTransitionTo('dismissed'))->toBeTrue();
        $alert->dismiss(1);
        expect($alert->fresh()->status)->toBe('dismissed');
    });

    it('blocks resolved → acknowledged', function () {
        $alert = createAlert('resolved', $this);
        expect($alert->canTransitionTo('acknowledged'))->toBeFalse();
        expect(fn () => $alert->acknowledge(1))->toThrow(InvalidArgumentException::class);
    });

    it('blocks resolved → dismissed', function () {
        $alert = createAlert('resolved', $this);
        expect($alert->canTransitionTo('dismissed'))->toBeFalse();
        expect(fn () => $alert->dismiss(1))->toThrow(InvalidArgumentException::class);
    });

    it('blocks dismissed → active', function () {
        $alert = createAlert('dismissed', $this);
        expect($alert->canTransitionTo('active'))->toBeFalse();
    });

    it('blocks dismissed → resolved', function () {
        $alert = createAlert('dismissed', $this);
        expect($alert->canTransitionTo('resolved'))->toBeFalse();
        expect(fn () => $alert->resolve(1))->toThrow(InvalidArgumentException::class);
    });
});

// ── SM-002 Work Order State Machine ──────────────────────────────────────

describe('SM-002 Work Order', function () {
    function createWorkOrder(string $status, object $context): WorkOrder
    {
        return WorkOrder::factory()->create([
            'site_id' => $context->site->id,
            'status' => $status,
        ]);
    }

    it('allows open → assigned', function () {
        $wo = createWorkOrder('open', $this);
        expect($wo->canTransitionTo('assigned'))->toBeTrue();
        $wo->assign(1);
        expect($wo->fresh()->status)->toBe('assigned');
    });

    it('allows open → in_progress', function () {
        $wo = createWorkOrder('open', $this);
        expect($wo->canTransitionTo('in_progress'))->toBeTrue();
        $wo->start();
        expect($wo->fresh()->status)->toBe('in_progress');
    });

    it('allows open → cancelled', function () {
        $wo = createWorkOrder('open', $this);
        expect($wo->canTransitionTo('cancelled'))->toBeTrue();
        $wo->cancel();
        expect($wo->fresh()->status)->toBe('cancelled');
    });

    it('allows assigned → in_progress', function () {
        $wo = createWorkOrder('assigned', $this);
        expect($wo->canTransitionTo('in_progress'))->toBeTrue();
        $wo->start();
        expect($wo->fresh()->status)->toBe('in_progress');
    });

    it('allows assigned → cancelled', function () {
        $wo = createWorkOrder('assigned', $this);
        expect($wo->canTransitionTo('cancelled'))->toBeTrue();
        $wo->cancel();
        expect($wo->fresh()->status)->toBe('cancelled');
    });

    it('allows in_progress → completed', function () {
        $wo = createWorkOrder('in_progress', $this);
        expect($wo->canTransitionTo('completed'))->toBeTrue();
        $wo->complete();
        expect($wo->fresh()->status)->toBe('completed');
    });

    it('allows in_progress → cancelled', function () {
        $wo = createWorkOrder('in_progress', $this);
        expect($wo->canTransitionTo('cancelled'))->toBeTrue();
        $wo->cancel();
        expect($wo->fresh()->status)->toBe('cancelled');
    });

    it('blocks completed → open', function () {
        $wo = createWorkOrder('completed', $this);
        expect($wo->canTransitionTo('open'))->toBeFalse();
        expect(fn () => $wo->start())->toThrow(InvalidArgumentException::class);
    });

    it('blocks completed → assigned', function () {
        $wo = createWorkOrder('completed', $this);
        expect($wo->canTransitionTo('assigned'))->toBeFalse();
        expect(fn () => $wo->assign(1))->toThrow(InvalidArgumentException::class);
    });

    it('blocks cancelled → open', function () {
        $wo = createWorkOrder('cancelled', $this);
        expect($wo->canTransitionTo('open'))->toBeFalse();
        expect(fn () => $wo->start())->toThrow(InvalidArgumentException::class);
    });
});

// ── SM-003 Invoice State Machine ─────────────────────────────────────────

describe('SM-003 Invoice', function () {
    beforeEach(function () {
        $this->billingProfile = BillingProfile::factory()->create([
            'org_id' => $this->org->id,
        ]);

        $this->subscription = Subscription::factory()->active()->create([
            'org_id' => $this->org->id,
            'billing_profile_id' => $this->billingProfile->id,
            'base_fee' => 5000.00,
            'discount_pct' => 0,
        ]);

        $this->invoiceService = new InvoiceService();
    });

    function createInvoice(string $status, object $context): Invoice
    {
        $invoice = $context->invoiceService->generateInvoice($context->subscription, '2026-03');

        if ($status !== 'draft') {
            $invoice->update(['status' => $status]);
        }

        return $invoice->fresh();
    }

    it('allows draft → sent', function () {
        $invoice = createInvoice('draft', $this);
        expect($invoice->canTransitionTo('sent'))->toBeTrue();
    });

    it('allows draft → paid', function () {
        $invoice = createInvoice('draft', $this);
        expect($invoice->canTransitionTo('paid'))->toBeTrue();
        $this->invoiceService->markPaid($invoice, 'transfer');
        expect($invoice->fresh()->status)->toBe('paid');
    });

    it('allows sent → paid', function () {
        $invoice = createInvoice('sent', $this);
        expect($invoice->canTransitionTo('paid'))->toBeTrue();
        $this->invoiceService->markPaid($invoice, 'card');
        expect($invoice->fresh()->status)->toBe('paid');
    });

    it('allows sent → overdue', function () {
        $invoice = createInvoice('sent', $this);
        expect($invoice->canTransitionTo('overdue'))->toBeTrue();
    });

    it('allows overdue → paid', function () {
        $invoice = createInvoice('overdue', $this);
        expect($invoice->canTransitionTo('paid'))->toBeTrue();
        $this->invoiceService->markPaid($invoice, 'transfer');
        expect($invoice->fresh()->status)->toBe('paid');
    });

    it('blocks paid → draft', function () {
        $invoice = createInvoice('paid', $this);
        expect($invoice->canTransitionTo('draft'))->toBeFalse();
    });

    it('blocks paid → sent', function () {
        $invoice = createInvoice('paid', $this);
        expect($invoice->canTransitionTo('sent'))->toBeFalse();
    });

    it('blocks overdue → draft', function () {
        $invoice = createInvoice('overdue', $this);
        expect($invoice->canTransitionTo('draft'))->toBeFalse();
    });

    it('throws InvalidArgumentException when markPaid on a paid invoice', function () {
        $invoice = createInvoice('paid', $this);
        expect(fn () => $this->invoiceService->markPaid($invoice, 'transfer'))
            ->toThrow(InvalidArgumentException::class);
    });
});
