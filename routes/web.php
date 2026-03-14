<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductExportController;
use App\Http\Controllers\SearchController;
use App\Notifications\ActivityNotification;
use App\Notifications\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Locale switching
Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // File Upload Demo
    Route::get('file-upload-demo', function () {
        return Inertia::render('file-upload-demo');
    })->name('file-upload-demo');

    // Notification Demo
    Route::get('notification-demo', function () {
        return Inertia::render('notification-demo');
    })->name('notification-demo');

    // UI Components Demo
    Route::get('ui-demo', function () {
        return Inertia::render('ui-demo');
    })->name('ui-demo');

    // Components Library Demo
    Route::get('components-demo', function () {
        return Inertia::render('components-demo');
    })->name('components-demo');

    // Products routes (CRUD resource)
    Route::resource('products', ProductController::class);

    // Bulk actions for products
    Route::post('products/bulk/update-status', [ProductController::class, 'bulkUpdateStatus'])->name('products.bulk.update-status');
    Route::delete('products/bulk/destroy', [ProductController::class, 'bulkDestroy'])->name('products.bulk.destroy');

    // Product export routes
    Route::get('products/{product}/pdf', [ProductExportController::class, 'pdf'])->name('products.pdf');
    Route::post('products/bulk/pdf', [ProductExportController::class, 'bulkPdf'])->name('products.bulk.pdf');
    Route::get('products/export/excel', [ProductExportController::class, 'excel'])->name('products.export.excel');

    // Search routes
    Route::get('api/search', [SearchController::class, 'search'])->name('api.search');
    Route::get('api/search/products', [SearchController::class, 'products'])->name('api.search.products');
    Route::get('api/search/typeahead', [SearchController::class, 'typeahead'])->name('api.search.typeahead');

    // Export download route
    Route::get('exports/download', function (Request $request) {
        $path = $request->query('path');

        if (! $path || ! \Illuminate\Support\Facades\Storage::disk('local')->exists($path)) {
            abort(404, 'Export file not found');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->download($path);
    })->name('exports.download');

    // Activity Log routes
    Route::get('activity-log', [ActivityLogController::class, 'index'])
        ->middleware('permission:view activity log')
        ->name('activity-log');

    Route::get('activity-log/user/{userId}', [ActivityLogController::class, 'userActivity'])
        ->middleware('permission:view activity log')
        ->name('activity-log.user');

    Route::get('activity-log/{model}/{id}', [ActivityLogController::class, 'modelActivity'])
        ->middleware('permission:view activity log')
        ->name('activity-log.model');

    // File Upload routes - rate limited to prevent abuse
    Route::post('upload', [FileUploadController::class, 'upload'])
        ->middleware('throttle:20,1')  // 20 uploads per minute
        ->name('upload');
    Route::post('upload/multiple', [FileUploadController::class, 'uploadMultiple'])
        ->middleware('throttle:10,1')  // 10 batch uploads per minute
        ->name('upload.multiple');
    Route::get('upload/allowed-types', [FileUploadController::class, 'allowedTypes'])
        ->name('upload.allowed-types');
    Route::delete('upload/{path}', [FileUploadController::class, 'delete'])
        ->name('upload.delete')
        ->where('path', '.*');

    // File management routes
    Route::prefix('files')->name('files.')->group(function () {
        Route::get('{file}', [FileController::class, 'show'])->name('show');
        Route::get('{file}/serve', [FileController::class, 'serve'])->name('serve');
        Route::get('{file}/download', [FileController::class, 'download'])->name('download');
        Route::delete('{file}', [FileController::class, 'destroy'])->name('destroy');
        Route::patch('{file}/visibility', [FileUploadController::class, 'updateVisibility'])->name('visibility');
    });

    // Notification routes
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-as-read');
    Route::post('notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-as-read');
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('notifications/read/delete-all', [NotificationController::class, 'deleteRead'])->name('notifications.delete-read');

    // Test notification API for demo page
    Route::post('api/notifications/test', function (Request $request): JsonResponse {
        $type = $request->input('type', 'info');
        $user = $request->user();

        $notification = match ($type) {
            'success' => new SystemNotification(
                title: 'Success!',
                message: 'This is a test success notification.',
                type: 'success',
                actionUrl: '/dashboard',
                actionText: 'View Dashboard'
            ),
            'error' => new SystemNotification(
                title: 'Error Occurred',
                message: 'This is a test error notification.',
                type: 'error',
                actionUrl: '/help',
                actionText: 'Get Help'
            ),
            'warning' => new SystemNotification(
                title: 'Warning',
                message: 'This is a test warning notification.',
                type: 'warning',
                actionUrl: '/settings',
                actionText: 'Review Settings'
            ),
            'info' => new SystemNotification(
                title: 'Information',
                message: 'This is a test info notification.',
                type: 'info',
                actionUrl: '/dashboard',
                actionText: 'Learn More'
            ),
            'comment' => new ActivityNotification(
                activityType: 'comment',
                description: 'Someone commented on your post (test).',
                resourceUrl: '/posts/test'
            ),
            'mention' => new ActivityNotification(
                activityType: 'mention',
                description: 'You were mentioned in a discussion (test).',
                resourceUrl: '/discussions/test'
            ),
            'created' => new ActivityNotification(
                activityType: 'created',
                description: 'A new item has been created (test).',
                resourceUrl: '/items/test'
            ),
            'published' => new ActivityNotification(
                activityType: 'published',
                description: 'Your content has been published (test)!',
                resourceUrl: '/content/test'
            ),
            'updated' => new ActivityNotification(
                activityType: 'updated',
                description: 'An item has been updated (test).',
                resourceUrl: '/items/test'
            ),
            default => new SystemNotification(
                title: 'Test Notification',
                message: 'This is a test notification.',
                type: 'info'
            ),
        };

        $user->notify($notification);

        return response()->json([
            'success' => true,
            'message' => 'Test notification sent',
        ]);
    })->name('api.notifications.test');
});

require __DIR__.'/settings.php';
