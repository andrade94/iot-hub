@extends('emails.layout')

@section('content')
    <h1>Corporate Summary — {{ $orgName }}</h1>

    <p>Here is the corporate summary for <strong>{{ $orgName }}</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Total Sites</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $summary['site_count'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Devices Online</td>
            <td style="padding: 12px; border: 1px solid #eee;">{{ $summary['device_totals']['online'] ?? 0 }} / {{ $summary['device_totals']['total'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Active Alerts</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $summary['total_active_alerts'] ?? 0 }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Alerts (24h)</td>
            <td style="padding: 12px; border: 1px solid #eee;">{{ $summary['total_alerts_24h'] ?? 0 }}</td>
        </tr>
    </table>

    @if(!empty($summary['sites']))
        <h2 style="font-size: 18px; margin-top: 25px; margin-bottom: 10px;">Per-Site Breakdown</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: left;">Site</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Devices</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Alerts (24h)</th>
                    <th style="padding: 10px; border: 1px solid #eee; background-color: #f5f5f5; text-align: right;">Active Alerts</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['sites'] as $site)
                    <tr>
                        <td style="padding: 10px; border: 1px solid #eee;">{{ $site['site_name'] }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $site['device_status']['online'] ?? 0 }}/{{ $site['device_status']['total'] ?? 0 }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $site['alert_count_24h'] ?? 0 }}</td>
                        <td style="padding: 10px; border: 1px solid #eee; text-align: right;">{{ $site['active_alert_count'] ?? 0 }}</td>
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
