<?php

use App\Http\Controllers\OrganizationSettingsController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // Organization settings — super_admin goes to org catalog, client admins go to their own org edit page
    Route::middleware(['verified'])->group(function () {
        Route::get('settings/organization', function () {
            $user = auth()->user();

            // Astrea staff (no org) → go to the organizations catalog
            if (! $user->org_id) {
                return redirect('/settings/organizations');
            }

            // Client admin → go to their org's edit page
            return redirect("/settings/organizations/{$user->org_id}/edit");
        })->name('organization.edit');
    });
});
