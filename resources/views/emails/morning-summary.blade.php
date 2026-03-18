@extends('emails.layout')

@section('content')
    <h1>Morning Summary — {{ $siteName }}</h1>

    <p>Here is your morning summary for <strong>{{ $siteName }}</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Devices Online</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $summary['device_status']['online'] ?? 0 }} / {{ $summary['device_status']['total'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Alerts (24h)</td>
            <td style="padding: 12px; border: 1px solid #eee;">{{ $summary['alert_count_24h'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Devices Offline</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $summary['device_status']['offline'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Low Battery</td>
            <td style="padding: 12px; border: 1px solid #eee;">{{ $summary['device_status']['low_battery'] ?? 0 }}</td>
        </tr>
    </table>

    @if(!empty($summary['active_alerts']))
        <h2 style="font-size: 18px; margin-top: 25px; margin-bottom: 10px;">Active Alerts</h2>
        @foreach($summary['active_alerts'] as $alert)
            <div class="notification-item {{ $alert['severity'] === 'critical' ? 'error' : ($alert['severity'] === 'high' ? 'warning' : 'info') }}">
                <div class="notification-title">{{ ucfirst($alert['severity']) }} — {{ $alert['device_name'] ?? 'Unknown device' }}</div>
                <div class="notification-time">{{ $alert['triggered_at'] ?? '' }}</div>
            </div>
        @endforeach
    @endif

    @if(!empty($summary['temperature_by_zone']))
        <h2 style="font-size: 18px; margin-top: 25px; margin-bottom: 10px;">Temperature by Zone</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: left;">Zone</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Min</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Avg</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Max</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['temperature_by_zone'] as $zone)
                    <tr>
                        <td style="padding: 10px; border: 1px solid #eee;">{{ $zone['zone'] }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $zone['min'] !== null ? $zone['min'] . '°C' : '—' }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $zone['avg'] !== null ? $zone['avg'] . '°C' : '—' }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $zone['max'] !== null ? $zone['max'] . '°C' : '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <p style="text-align: center;">
        <a href="{{ $appUrl }}/dashboard" class="button">View Dashboard</a>
    </p>

    <p>Best regards,<br>The {{ $appName }} Team</p>
@endsection
