<?php

// Covers: WF-STATUS — Platform status page (public)

test('status page is accessible without authentication', function () {
    $this->get(route('status'))
        ->assertOk();
});

test('status page returns services array', function () {
    $response = $this->get(route('status'));

    $response->assertOk();

    $page = $response->viewData('page');
    $services = $page['props']['services'];

    expect($services)->toBeArray()
        ->and(count($services))->toBeGreaterThanOrEqual(1);
});

test('each service has name, slug, status, and description', function () {
    $response = $this->get(route('status'));

    $page = $response->viewData('page');
    $services = $page['props']['services'];

    foreach ($services as $service) {
        expect($service)->toHaveKeys(['name', 'slug', 'status', 'description']);
        expect($service['status'])->toBeIn(['operational', 'degraded', 'down']);
    }
});

test('status page includes checkedAt timestamp', function () {
    $response = $this->get(route('status'));

    $page = $response->viewData('page');

    expect($page['props'])->toHaveKey('checkedAt');
    expect($page['props']['checkedAt'])->toBeString();
});

test('web_app service is present in status response', function () {
    $response = $this->get(route('status'));

    $page = $response->viewData('page');
    $services = collect($page['props']['services']);

    $webApp = $services->firstWhere('slug', 'web_app');
    expect($webApp)->not->toBeNull()
        ->and($webApp['name'])->toBe('Web Application');
});

test('all expected services are listed', function () {
    $response = $this->get(route('status'));

    $page = $response->viewData('page');
    $slugs = collect($page['props']['services'])->pluck('slug')->toArray();

    expect($slugs)->toContain('web_app')
        ->toContain('mobile_api')
        ->toContain('mqtt_pipeline')
        ->toContain('whatsapp')
        ->toContain('push_notifications');
});

test('web_app returns operational when database is reachable', function () {
    // Since we're running with an in-memory SQLite database, the DB is always reachable
    $response = $this->get(route('status'));

    $page = $response->viewData('page');
    $webApp = collect($page['props']['services'])->firstWhere('slug', 'web_app');

    expect($webApp['status'])->toBe('operational');
});
