<?php

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
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Register Spatie Permission middleware aliases
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
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
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
