@extends('emails.layout')

@section('content')
    <h1>Welcome to {{ $appName }}!</h1>

    <p>Hi {{ $user->name }},</p>

    <p>Thank you for creating an account with us. We're excited to have you on board!</p>

    <p>Your account has been successfully created and you can now access all the features of our platform.</p>

    <p style="text-align: center;">
        <a href="{{ $dashboardUrl }}" class="button">Go to Dashboard</a>
    </p>

    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>

    <p>Best regards,<br>The {{ $appName }} Team</p>
@endsection
