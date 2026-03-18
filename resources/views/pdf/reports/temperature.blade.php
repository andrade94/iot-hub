<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Temperature Report — {{ $site->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.5; color: #333; }
        .container { padding: 25px; }
        .header { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; }
        .header h1 { font-size: 20px; margin-bottom: 2px; }
        .header .meta { color: #666; font-size: 10px; }
        .summary { display: flex; margin-bottom: 20px; }
        .summary-card { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 4px; margin-right: 10px; text-align: center; }
        .summary-card:last-child { margin-right: 0; }
        .summary-card .value { font-size: 22px; font-weight: bold; }
        .summary-card .label { font-size: 9px; color: #666; text-transform: uppercase; }
        .success { color: #16a34a; }
        .warning { color: #d97706; }
        .danger { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
        th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #666; }
        .text-right { text-align: right; }
        .section { margin-bottom: 20px; }
        .section h2 { font-size: 14px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .footer { position: fixed; bottom: 15px; left: 25px; right: 25px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Temperature Compliance Report</h1>
        <div class="meta">{{ $site->name }} — {{ $from }} to {{ $to }} — Generated {{ now()->format('M j, Y g:i A') }}</div>
    </div>

    <table style="margin-bottom: 20px;">
        <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold;">{{ number_format($report['summary']['total_readings']) }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Total Readings</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold; color: #dc2626;">{{ $report['summary']['total_excursions'] }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Excursions</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                @php $pct = $report['summary']['compliance_pct']; @endphp
                <div style="font-size: 20px; font-weight: bold;" class="{{ $pct >= 95 ? 'success' : ($pct >= 80 ? 'warning' : 'danger') }}">{{ $pct }}%</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Compliance</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold;">{{ count($report['per_zone']) }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Zones</div>
            </td>
        </tr>
    </table>

    @foreach ($report['per_zone'] as $zone)
    <div class="section">
        <h2>{{ $zone['zone'] }}</h2>
        <table>
            <thead>
                <tr>
                    <th>Device</th>
                    <th>Model</th>
                    <th class="text-right">Min °C</th>
                    <th class="text-right">Avg °C</th>
                    <th class="text-right">Max °C</th>
                    <th class="text-right">Readings</th>
                    <th class="text-right">Excursions</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($zone['devices'] as $device)
                <tr>
                    <td>{{ $device['name'] }}</td>
                    <td>{{ $device['model'] }}</td>
                    <td class="text-right">{{ number_format($device['min_temp'], 1) }}</td>
                    <td class="text-right">{{ number_format($device['avg_temp'], 1) }}</td>
                    <td class="text-right">{{ number_format($device['max_temp'], 1) }}</td>
                    <td class="text-right">{{ $device['readings_count'] }}</td>
                    <td class="text-right">
                        @if (count($device['excursions']) > 0)
                            <span class="badge badge-danger">{{ count($device['excursions']) }}</span>
                        @else
                            <span class="badge badge-success">0</span>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endforeach

    <div class="footer">
        {{ config('app.name') }} — Temperature Compliance Report — Confidential
    </div>
</div>
</body>
</html>
