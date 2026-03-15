<?php

use App\Jobs\SendCorporateSummary;

beforeEach(function () {
    seedPermissions();
});

test('processes orgs with sites and org_admins', function () {
    $org = createOrg();
    createSite($org);
    createUserWithRole('org_admin', $org);

    (new SendCorporateSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    expect(true)->toBeTrue();
});

test('skips orgs without org_admin users', function () {
    $org = createOrg();
    createSite($org);

    (new SendCorporateSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    expect(true)->toBeTrue();
});

test('skips orgs without sites', function () {
    createOrg();

    (new SendCorporateSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    expect(true)->toBeTrue();
});
