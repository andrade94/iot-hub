<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $appName }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-content {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .email-logo {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .email-body {
            margin-bottom: 30px;
        }
        .email-footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        }
        p {
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000;
            color: #fff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #333;
        }
        .notification-item {
            padding: 15px;
            border-left: 3px solid #ddd;
            margin-bottom: 10px;
            background-color: #f9f9f9;
        }
        .notification-item.success {
            border-left-color: #22c55e;
        }
        .notification-item.warning {
            border-left-color: #f59e0b;
        }
        .notification-item.error {
            border-left-color: #ef4444;
        }
        .notification-item.info {
            border-left-color: #3b82f6;
        }
        .notification-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .notification-time {
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-content">
            <div class="email-header">
                <div class="email-logo">{{ $appName }}</div>
            </div>

            <div class="email-body">
                @yield('content')
            </div>

            <div class="email-footer">
                <p>&copy; {{ date('Y') }} {{ $appName }}. All rights reserved.</p>
                <p>
                    <a href="{{ $appUrl }}">Visit our website</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
