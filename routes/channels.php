<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// IoT real-time channels
Broadcast::channel('site.{siteId}', function ($user, $siteId) {
    return $user->canAccessSite((int) $siteId);
});

Broadcast::channel('device.{deviceId}', function ($user, $deviceId) {
    $device = \App\Models\Device::find($deviceId);

    return $device && $user->canAccessSite($device->site_id);
});
