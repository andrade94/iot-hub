<?php

use App\Http\Middleware\ApplyOrgBranding;
use App\Http\Middleware\EnsureModuleActive;
use App\Http\Middleware\EnsureOrganizationScope;
use App\Http\Middleware\EnsureSiteAccess;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            SetLocale::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            ApplyOrgBranding::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Register middleware aliases
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'org.scope' => EnsureOrganizationScope::class,
            'site.access' => EnsureSiteAccess::class,
            'module.active' => EnsureModuleActive::class,
            'privacy' => \App\Http\Middleware\EnsurePrivacyConsent::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        // Clean up expired sessions (daily at 2:00 AM)
        $schedule->command('session:gc')->dailyAt('02:00');

        // Clean up old notifications (weekly on Sunday at 3:00 AM)
        $schedule->command('notifications:cleanup --days=30 --unread-days=90')
            ->weeklyOn(0, '03:00');

        // Clean up orphaned files (daily at 4:00 AM)
        $schedule->command('files:cleanup-orphaned --hours=24')
            ->dailyAt('04:00');

        // Clean up temp files (daily at 4:30 AM)
        $schedule->command('files:cleanup-temp --hours=24')
            ->dailyAt('04:30');

        // Clean up activity log (monthly on the 1st at 5:00 AM)
        $schedule->command('activitylog:cleanup --days=90')
            ->monthlyOn(1, '05:00');

        // Send daily notification digests (daily at 8:00 AM)
        $schedule->command('notifications:send-digest --period=daily')
            ->dailyAt('08:00')
            ->when(fn () => config('mail.mailer') !== 'log');

        // Send weekly notification digests (Mondays at 9:00 AM)
        $schedule->command('notifications:send-digest --period=weekly')
            ->weeklyOn(1, '09:00')
            ->when(fn () => config('mail.mailer') !== 'log');

        // Check device health (every 5 minutes)
        $schedule->job(new \App\Jobs\CheckDeviceHealth)->everyFiveMinutes();

        // Detect platform-wide outage — zero readings (every 5 minutes)
        $schedule->job(new \App\Jobs\DetectPlatformOutage)->everyFiveMinutes();

        // Send scheduled reports (daily at 6:00 AM)
        $schedule->job(new \App\Jobs\SendScheduledReports)->dailyAt('06:00');

        // Clean up expired data exports (daily at 3:00 AM)
        $schedule->call(function () {
            \App\Models\DataExport::where('status', 'completed')
                ->where('expires_at', '<', now())
                ->each(function ($export) {
                    if ($export->file_path) {
                        \Illuminate\Support\Facades\Storage::disk('local')->delete($export->file_path);
                    }
                    $export->update(['status' => 'expired', 'file_path' => null]);
                });
        })->dailyAt('03:00');

        // Check expired alert snoozes + re-notify (every minute)
        $schedule->job(new \App\Jobs\CheckExpiredSnoozes)->everyMinute();

        // Morning summaries (runs every minute, timezone-aware)
        $schedule->job(new \App\Jobs\SendMorningSummary)->everyMinute();

        // Regional summaries for site_managers (30 min after earliest site opening)
        $schedule->job(new \App\Jobs\SendRegionalSummary)->everyMinute();

        // Corporate summaries for org_admins (daily at 8:00 AM)
        $schedule->job(new \App\Jobs\SendCorporateSummary)->dailyAt('08:00');

        // Sync subscription metering (daily at 1:00 AM)
        $schedule->command('billing:sync-metering')->dailyAt('01:00');

        // Generate monthly invoices (1st of each month at 6:00 AM)
        $schedule->command('billing:generate-invoices')->monthlyOn(1, '06:00');

        // Mark overdue invoices (daily at 12:30 AM)
        $schedule->command('billing:mark-overdue')->dailyAt('00:30');

        // Send calibration expiry reminders (daily at 7:30 AM)
        $schedule->job(new \App\Jobs\SendCalibrationReminders)->dailyAt('07:30');

        // Send compliance reminders (daily at 7:00 AM)
        $schedule->command('compliance:send-reminders')->dailyAt('07:00')
            ->when(fn () => config('mail.mailer') !== 'log');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
