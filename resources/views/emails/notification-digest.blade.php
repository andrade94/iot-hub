@extends('emails.layout')

@section('content')
    <h1>Your {{ ucfirst($period) }} Notification Digest</h1>

    <p>Hi {{ $user->name }},</p>

    <p>Here's a summary of your unread notifications from the past {{ $period === 'weekly' ? 'week' : 'day' }}:</p>

    @foreach($notifications as $notification)
        <div class="notification-item {{ $notification->data['type'] ?? 'info' }}">
            <div class="notification-title">{{ $notification->data['title'] ?? 'Notification' }}</div>
            <p>{{ $notification->data['message'] ?? '' }}</p>
            <div class="notification-time">{{ $notification->created_at->diffForHumans() }}</div>
        </div>
    @endforeach

    <p style="text-align: center;">
        <a href="{{ $notificationsUrl }}" class="button">View All Notifications</a>
    </p>

    <p>Best regards,<br>The {{ $appName }} Team</p>
@endsection
