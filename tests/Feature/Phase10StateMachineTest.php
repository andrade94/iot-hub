<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\CorrectiveAction;
use App\Models\DataExport;
use App\Models\OutageDeclaration;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

// ── SM-011 CorrectiveAction State Machine ────────────────────────────────

describe('SM-011 CorrectiveAction', function () {
    beforeEach(function () {
        seedPermissions();

        $this->device = createDevice($this->site);
        $this->taker = createUserWithRole('technician', $this->org);
        $this->verifier = createUserWithRole('client_site_manager', $this->org);

        $rule = AlertRule::create([
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'name' => 'Test Rule',
            'type' => 'threshold',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 30]],
            'severity' => 'warning',
            'cooldown_minutes' => 15,
            'active' => true,
        ]);

        $this->alert = Alert::create([
            'rule_id' => $rule->id,
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'severity' => 'warning',
            'status' => 'active',
            'triggered_at' => now(),
            'data' => ['metric' => 'temperature', 'value' => 35, 'threshold' => 30],
        ]);
    });

    function createCorrectiveAction(string $status, object $context): CorrectiveAction
    {
        return CorrectiveAction::create([
            'alert_id' => $context->alert->id,
            'site_id' => $context->site->id,
            'action_taken' => 'Replaced faulty sensor',
            'status' => $status,
            'taken_by' => $context->taker->id,
            'taken_at' => now(),
        ]);
    }

    it('allows logged → verified by a different user', function () {
        $ca = createCorrectiveAction('logged', $this);

        $ca->verify($this->verifier->id);

        $fresh = $ca->fresh();
        expect($fresh->status)->toBe('verified')
            ->and($fresh->verified_by)->toBe($this->verifier->id)
            ->and($fresh->verified_at)->not->toBeNull();
    });

    it('blocks logged → verified by the same user', function () {
        $ca = createCorrectiveAction('logged', $this);

        expect(fn () => $ca->verify($this->taker->id))
            ->toThrow(InvalidArgumentException::class, 'Cannot verify your own corrective action.');
    });

    it('blocks verify on already verified action (verified is terminal)', function () {
        $ca = createCorrectiveAction('verified', $this);

        expect(fn () => $ca->verify($this->verifier->id))
            ->toThrow(InvalidArgumentException::class, 'Only logged actions can be verified.');
    });

    it('only allows logged status to be verified', function () {
        $ca = createCorrectiveAction('logged', $this);

        // Force an invalid status to ensure guard works
        $ca->update(['status' => 'some_other_status']);

        expect(fn () => $ca->verify($this->verifier->id))
            ->toThrow(InvalidArgumentException::class, 'Only logged actions can be verified.');
    });
});

// ── SM-012 DataExport State Machine ──────────────────────────────────────

describe('SM-012 DataExport', function () {
    beforeEach(function () {
        seedPermissions();
        $this->user = createUserWithRole('client_org_admin', $this->org);
    });

    function createExport(string $status, object $context): DataExport
    {
        return DataExport::create([
            'org_id' => $context->org->id,
            'status' => $status,
            'date_from' => now()->subMonth(),
            'date_to' => now(),
            'requested_by' => $context->user->id,
        ]);
    }

    // --- Valid transitions ---

    it('allows queued → processing via markProcessing', function () {
        $export = createExport('queued', $this);

        expect($export->canTransitionTo('processing'))->toBeTrue();

        $export->markProcessing();

        $fresh = $export->fresh();
        expect($fresh->status)->toBe('processing')
            ->and($fresh->attempts)->toBe(1);
    });

    it('allows processing → completed via markCompleted', function () {
        $export = createExport('processing', $this);

        expect($export->canTransitionTo('completed'))->toBeTrue();

        $export->markCompleted('/exports/data.csv', 1024);

        $fresh = $export->fresh();
        expect($fresh->status)->toBe('completed')
            ->and($fresh->file_path)->toBe('/exports/data.csv')
            ->and($fresh->file_size)->toBe(1024)
            ->and($fresh->completed_at)->not->toBeNull()
            ->and($fresh->expires_at)->not->toBeNull()
            ->and($fresh->error)->toBeNull();
    });

    it('allows processing → failed via markFailed', function () {
        $export = createExport('processing', $this);

        expect($export->canTransitionTo('failed'))->toBeTrue();

        $export->markFailed('Out of memory');

        $fresh = $export->fresh();
        expect($fresh->status)->toBe('failed')
            ->and($fresh->error)->toBe('Out of memory');
    });

    it('allows failed → queued (retry)', function () {
        $export = createExport('failed', $this);

        expect($export->canTransitionTo('queued'))->toBeTrue();
    });

    it('allows completed → expired', function () {
        $export = createExport('completed', $this);

        expect($export->canTransitionTo('expired'))->toBeTrue();
    });

    it('increments attempts on each markProcessing call', function () {
        $export = createExport('queued', $this);

        $export->markProcessing();
        expect($export->fresh()->attempts)->toBe(1);

        // Simulate retry: set back to queued, then process again
        $export->update(['status' => 'queued']);
        $export->markProcessing();
        expect($export->fresh()->attempts)->toBe(2);
    });

    // --- Invalid transitions ---

    it('blocks queued → completed', function () {
        $export = createExport('queued', $this);
        expect($export->canTransitionTo('completed'))->toBeFalse();
    });

    it('blocks queued → failed', function () {
        $export = createExport('queued', $this);
        expect($export->canTransitionTo('failed'))->toBeFalse();
    });

    it('blocks queued → expired', function () {
        $export = createExport('queued', $this);
        expect($export->canTransitionTo('expired'))->toBeFalse();
    });

    it('blocks completed → queued', function () {
        $export = createExport('completed', $this);
        expect($export->canTransitionTo('queued'))->toBeFalse();
    });

    it('blocks completed → processing', function () {
        $export = createExport('completed', $this);
        expect($export->canTransitionTo('processing'))->toBeFalse();
    });

    it('blocks completed → failed', function () {
        $export = createExport('completed', $this);
        expect($export->canTransitionTo('failed'))->toBeFalse();
    });

    it('blocks failed → completed', function () {
        $export = createExport('failed', $this);
        expect($export->canTransitionTo('completed'))->toBeFalse();
    });

    it('blocks failed → processing', function () {
        $export = createExport('failed', $this);
        expect($export->canTransitionTo('processing'))->toBeFalse();
    });

    it('blocks expired → any status', function () {
        $export = createExport('expired', $this);

        expect($export->canTransitionTo('queued'))->toBeFalse()
            ->and($export->canTransitionTo('processing'))->toBeFalse()
            ->and($export->canTransitionTo('completed'))->toBeFalse()
            ->and($export->canTransitionTo('failed'))->toBeFalse();
    });
});

// ── SM-013 OutageDeclaration State Machine ───────────────────────────────

describe('SM-013 OutageDeclaration', function () {
    beforeEach(function () {
        seedPermissions();
        $this->declarer = createUserWithRole('client_org_admin', $this->org);
        $this->resolver = createUserWithRole('client_org_admin', $this->org);
    });

    function createOutage(string $status, object $context): OutageDeclaration
    {
        return OutageDeclaration::create([
            'reason' => 'Power failure in sector 7',
            'affected_services' => ['monitoring', 'alerts'],
            'status' => $status,
            'declared_by' => $context->declarer->id,
            'declared_at' => now(),
        ]);
    }

    it('allows active → resolved', function () {
        $outage = createOutage('active', $this);

        $outage->resolve($this->resolver->id);

        $fresh = $outage->fresh();
        expect($fresh->status)->toBe('resolved')
            ->and($fresh->resolved_by)->toBe($this->resolver->id)
            ->and($fresh->resolved_at)->not->toBeNull();
    });

    it('blocks resolve on already resolved outage (resolved is terminal)', function () {
        $outage = createOutage('resolved', $this);

        expect(fn () => $outage->resolve($this->resolver->id))
            ->toThrow(InvalidArgumentException::class, 'Only active outages can be resolved.');
    });

    it('only allows active status to be resolved', function () {
        $outage = createOutage('active', $this);

        // Force an invalid status to ensure guard works
        $outage->update(['status' => 'some_other_status']);

        expect(fn () => $outage->resolve($this->resolver->id))
            ->toThrow(InvalidArgumentException::class, 'Only active outages can be resolved.');
    });

    it('tracks the active outage via isActive helper', function () {
        expect(OutageDeclaration::isActive())->toBeFalse();

        $outage = createOutage('active', $this);
        expect(OutageDeclaration::isActive())->toBeTrue();

        $outage->resolve($this->resolver->id);
        expect(OutageDeclaration::isActive())->toBeFalse();
    });

    it('returns current active outage via current helper', function () {
        expect(OutageDeclaration::current())->toBeNull();

        $outage = createOutage('active', $this);
        expect(OutageDeclaration::current()->id)->toBe($outage->id);

        $outage->resolve($this->resolver->id);
        expect(OutageDeclaration::current())->toBeNull();
    });
});
