# Activity Logging

This template includes a complete activity logging system powered by [Spatie Laravel Activitylog](https://spatie.be/docs/laravel-activitylog). Track all user actions, model changes, and system events with a beautiful timeline interface.

## Features

- ✅ Automatic logging of model changes (create, update, delete)
- ✅ User action tracking (who did what)
- ✅ Property change tracking (before/after values)
- ✅ Timeline component for displaying logs
- ✅ Filtering and pagination
- ✅ Permission-protected routes
- ✅ Beautiful UI components

---

## Quick Start

### View Activity Logs

Visit `/activity-log` (requires `view activity log` permission):

```tsx
import { Link } from '@inertiajs/react';

<Link href="/activity-log">View Activity Log</Link>
```

### Enable Logging on a Model

Add the `LogsActivity` trait to any model:

```php
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Post extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'content', 'status'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
```

Now all changes to `Post` models will be automatically logged!

---

## Backend Usage

### Logging Model Changes

The `User` model already has logging enabled:

```php
// app/Models/User.php
use LogsActivity;

public function getActivitylogOptions(): LogOptions
{
    return LogOptions::defaults()
        ->logOnly(['name', 'email']) // Log these fields
        ->logOnlyDirty() // Only log changed values
        ->dontSubmitEmptyLogs() // Skip if nothing changed
        ->setDescriptionForEvent(fn(string $eventName) => "User {$eventName}");
}
```

### Manual Activity Logging

Log custom activities:

```php
use Spatie\Activitylog\Models\Activity;

// Simple log
activity()->log('User viewed dashboard');

// Log with subject
activity()
    ->performedOn($post)
    ->log('User viewed post');

// Log with causer
activity()
    ->causedBy($user)
    ->performedOn($post)
    ->log('User edited post');

// Log with properties
activity()
    ->causedBy($user)
    ->withProperties(['ip' => $request->ip()])
    ->log('User logged in');
```

### Logging Events

Listen to model events:

```php
// Automatically logged by trait:
$user->update(['name' => 'New Name']); // Logs "updated" event

$user->delete(); // Logs "deleted" event

// Custom events
activity()
    ->causedBy($user)
    ->event('custom_event')
    ->log('Something custom happened');
```

### Retrieving Activities

```php
// Get all activities
$activities = Activity::all();

// Get activities for a specific user
$activities = Activity::causedBy($user)->get();

// Get activities on a model
$activities = Activity::forSubject($post)->get();

// Get recent activities
$activities = Activity::latest()->take(10)->get();

// Get activities with relationships
$activities = Activity::with(['causer', 'subject'])->get();
```

---

## Frontend Components

### Activity Timeline

Display a list of activities with the `ActivityTimeline` component:

```tsx
import { ActivityTimeline } from '@/components/ui/activity-timeline';

function MyComponent() {
    const activities = [...]; // From backend

    return (
        <ActivityTimeline
            activities={activities}
            emptyMessage="No activity yet"
            showDetails={true}
        />
    );
}
```

### Activity Log Item

Display a single activity:

```tsx
import { ActivityLogItem } from '@/components/ui/activity-log-item';

function MyComponent() {
    const activity = {...}; // Single activity

    return (
        <ActivityLogItem
            activity={activity}
            showDetails={true}
        />
    );
}
```

### Activity Log Page

The full page is available at `/activity-log`:

```tsx
// resources/js/pages/activity-log.tsx
// Includes filtering, pagination, and refresh
```

---

## Utility Functions

Use the activity utility helpers:

```tsx
import {
    formatRelativeTime,
    formatDateTime,
    getEventName,
    getEventColor,
    getModelName,
    getCauserName,
    getChangedProperties,
} from '@/utils/activity';

// Format dates
formatRelativeTime('2024-01-01'); // "2 hours ago"
formatDateTime('2024-01-01'); // "Jan 1, 2024, 9:30 AM"

// Get event info
getEventName('created'); // "Created"
getEventColor('updated'); // "bg-blue-500"

// Get model info
getModelName('App\\Models\\User'); // "User"

// Get causer
getCauserName(activity); // "John Doe" or "System"

// Get property changes
const changes = getChangedProperties(activity);
// [{ field: 'name', old: 'Old Name', new: 'New Name' }]
```

---

## Routes

Activity log routes (all require `view activity log` permission):

```php
// Main activity log page
GET /activity-log

// User-specific activities (API)
GET /activity-log/user/{userId}

// Model-specific activities (API)
GET /activity-log/{model}/{id}
```

---

## Configuration

The activity log is configured in `config/activitylog.php`:

```php
return [
    // Database table name
    'table_name' => 'activity_log',

    // Default log name
    'default_log_name' => 'default',

    // How long to keep logs (null = forever)
    'delete_records_older_than_days' => 365,
];
```

---

## Advanced Usage

### Custom Log Names

Organize logs with custom names:

```php
activity('authentication')->log('User logged in');
activity('orders')->log('Order placed');

// Query by log name
Activity::inLog('authentication')->get();
```

### Batch Operations

Group related activities:

```php
$batchUuid = Str::uuid();

activity()
    ->withProperty('batch_uuid', $batchUuid)
    ->log('First action');

activity()
    ->withProperty('batch_uuid', $batchUuid)
    ->log('Second action');

// Query by batch
Activity::where('batch_uuid', $batchUuid)->get();
```

### Custom Properties

Store additional data:

```php
activity()
    ->withProperties([
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent(),
        'custom_data' => ['foo' => 'bar'],
    ])
    ->log('Custom event');

// Access properties
$activity->properties->get('ip');
$activity->properties->get('custom_data.foo');
```

### Disable Logging Temporarily

```php
use Spatie\Activitylog\Facades\LogBatch;

LogBatch::startBatch();
// ... perform actions without logging
LogBatch::endBatch();
```

---

## Permissions

Activity logging requires the `view activity log` permission:

```tsx
import { Can } from '@/components/Can';

<Can permission="view activity log">
    <Link href="/activity-log">View Activity Log</Link>
</Can>
```

Backend:

```php
Route::get('/activity-log', [ActivityLogController::class, 'index'])
    ->middleware('permission:view activity log');
```

---

## Database Schema

The activity_log table structure:

```sql
- id
- log_name (nullable)
- description
- subject_type (nullable)
- subject_id (nullable)
- causer_type (nullable)
- causer_id (nullable)
- properties (json, nullable)
- batch_uuid (nullable)
- event (nullable)
- created_at
- updated_at
```

---

## Example: Tracking User Authentication

```php
// In your LoginController or event listener
use Spatie\Activitylog\Facades\CauserResolver;

// After successful login
activity('authentication')
    ->causedBy($user)
    ->withProperties([
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent(),
    ])
    ->log('User logged in');

// After logout
activity('authentication')
    ->causedBy($user)
    ->log('User logged out');
```

---

## Example: Tracking Model Changes

```php
// models automatically log changes with the trait
class Product extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll() // Log all attributes
            ->logOnlyDirty() // Only changed values
            ->setDescriptionForEvent(function(string $eventName) {
                return "Product was {$eventName}";
            });
    }
}

// Usage
$product = Product::create(['name' => 'Widget', 'price' => 10]);
// Logs: "Product was created"

$product->update(['price' => 15]);
// Logs: "Product was updated" with price change

$product->delete();
// Logs: "Product was deleted"
```

---

## Troubleshooting

### Activities not logging

1. Check that the model has the `LogsActivity` trait
2. Verify `getActivitylogOptions()` is configured
3. Ensure database table exists: `php artisan migrate`

### Performance issues with many logs

```php
// config/activitylog.php
'delete_records_older_than_days' => 90,
```

Run cleanup:

```bash
php artisan activitylog:clean
```

### Can't see activities

Check permissions:

```php
$user->givePermissionTo('view activity log');
```

---

## Resources

- [Spatie Laravel Activitylog Documentation](https://spatie.be/docs/laravel-activitylog)
- [GitHub Repository](https://github.com/spatie/laravel-activitylog)

---

**Last Updated:** 2025-10-21
