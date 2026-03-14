<?php

namespace App\Providers;

use App\Mail\WelcomeMail;
use App\Models\File;
use App\Models\Product;
use App\Policies\FilePolicy;
use App\Policies\NotificationPolicy;
use App\Policies\ProductPolicy;
use Illuminate\Auth\Events\Registered;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(DatabaseNotification::class, NotificationPolicy::class);
        Gate::policy(File::class, FilePolicy::class);

        // Send welcome email when a user registers
        // Only sends when mail is configured (not log driver)
        Event::listen(Registered::class, function (Registered $event) {
            if (config('mail.default') !== 'log') {
                Mail::to($event->user)->queue(new WelcomeMail($event->user));
            }
        });
    }
}
