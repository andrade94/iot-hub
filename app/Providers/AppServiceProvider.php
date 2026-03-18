<?php

namespace App\Providers;

use App\Mail\WelcomeMail;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\BillingProfile;
use App\Models\Device;
use App\Models\EscalationChain;
use App\Models\File;
use App\Models\Gateway;
use App\Models\Recipe;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use App\Policies\AlertPolicy;
use App\Policies\AlertRulePolicy;
use App\Policies\BillingPolicy;
use App\Policies\DevicePolicy;
use App\Policies\EscalationChainPolicy;
use App\Policies\FilePolicy;
use App\Policies\GatewayPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\RecipePolicy;
use App\Policies\SitePolicy;
use App\Policies\UserPolicy;
use App\Policies\WorkOrderPolicy;
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
        Gate::policy(DatabaseNotification::class, NotificationPolicy::class);
        Gate::policy(File::class, FilePolicy::class);
        Gate::policy(Gateway::class, GatewayPolicy::class);
        Gate::policy(Device::class, DevicePolicy::class);
        Gate::policy(Alert::class, AlertPolicy::class);
        Gate::policy(AlertRule::class, AlertRulePolicy::class);
        Gate::policy(WorkOrder::class, WorkOrderPolicy::class);
        Gate::policy(Site::class, SitePolicy::class);
        Gate::policy(Recipe::class, RecipePolicy::class);
        Gate::policy(EscalationChain::class, EscalationChainPolicy::class);
        Gate::policy(BillingProfile::class, BillingPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        // Send welcome email when a user registers
        // Only sends when mail is configured (not log driver)
        Event::listen(Registered::class, function (Registered $event) {
            if (config('mail.default') !== 'log') {
                Mail::to($event->user)->queue(new WelcomeMail($event->user));
            }
        });
    }
}
