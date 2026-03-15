<?php

use App\Models\Gateway;
use App\Models\Organization;
use App\Models\Site;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org-gw', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
    ]);
});

test('gateways can be created for a site', function () {
    $gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-TEST-001',
        'status' => 'offline',
    ]);

    expect($gateway)->toBeInstanceOf(Gateway::class)
        ->and($gateway->site_id)->toBe($this->site->id)
        ->and($gateway->model)->toBe('UG65')
        ->and($gateway->serial)->toBe('GW-TEST-001');
});

test('gateway belongs to a site', function () {
    $gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-TEST-002',
    ]);

    expect($gateway->site->id)->toBe($this->site->id);
});

test('site has many gateways', function () {
    Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-A']);
    Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-B']);

    expect($this->site->gateways)->toHaveCount(2);
});

test('gateway online scope filters correctly', function () {
    Gateway::create([
        'site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-ONLINE',
        'last_seen_at' => now()->subMinutes(5), 'status' => 'online',
    ]);
    Gateway::create([
        'site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-OFFLINE',
        'last_seen_at' => now()->subMinutes(30), 'status' => 'offline',
    ]);

    expect(Gateway::online()->count())->toBe(1);
});

test('gateway is scoped to organization via site', function () {
    $otherOrg = Organization::create([
        'name' => 'Other Org', 'slug' => 'other-org-gw', 'segment' => 'energy',
    ]);
    $otherSite = Site::create([
        'org_id' => $otherOrg->id, 'name' => 'Other Site', 'status' => 'active',
    ]);

    $ownGateway = Gateway::create([
        'site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-OWN',
    ]);
    $otherGateway = Gateway::create([
        'site_id' => $otherSite->id, 'model' => 'UG65', 'serial' => 'GW-OTHER',
    ]);

    $siteGateways = Gateway::forSite($this->site->id)->get();

    expect($siteGateways)->toHaveCount(1)
        ->and($siteGateways->first()->id)->toBe($ownGateway->id);
});

test('deleting a site cascades to gateways', function () {
    Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-CASCADE']);

    $this->site->forceDelete();

    expect(Gateway::count())->toBe(0);
});
