<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Energy Report — {{ $site->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.5; color: #333; }
        .container { padding: 25px; }
        .header { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; }
        .header h1 { font-size: 20px; margin-bottom: 2px; }
        .header .meta { color: #666; font-size: 10px; }
        .success { color: #16a34a; }
        .warning { color: #d97706; }
        .danger { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
        th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #666; }
        .text-right { text-align: right; }
        .section { margin-bottom: 20px; }
        .section h2 { font-size: 14px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
        .footer { position: fixed; bottom: 15px; left: 25px; right: 25px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Energy Consumption Report</h1>
        <div class="meta">{{ $site->name }} — {{ $from }} to {{ $to }} — Generated {{ now()->format('M j, Y g:i A') }}</div>
    </div>

    <table style="margin-bottom: 20px;">
        <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold;">{{ number_format($report['summary']['total_kwh'], 1) }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Total kWh</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold;">${{ number_format($report['summary']['total_cost_mxn'], 2) }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Total Cost (MXN)</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                <div style="font-size: 20px; font-weight: bold;">{{ number_format($report['summary']['avg_daily_kwh'], 1) }}</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">Avg Daily kWh</div>
            </td>
            <td style="width: 25%; text-align: center; border: 1px solid #e5e5e5; padding: 12px;">
                @php $vs = $report['summary']['vs_baseline_pct'] ?? 0; @endphp
                <div style="font-size: 20px; font-weight: bold;" class="{{ $vs <= 0 ? 'success' : 'danger' }}">{{ $vs > 0 ? '+' : '' }}{{ $vs }}%</div>
                <div style="font-size: 9px; color: #666; text-transform: uppercase;">vs Baseline</div>
            </td>
        </tr>
    </table>

    <div class="section">
        <h2>Per-Device Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Device</th>
                    <th>Model</th>
                    <th class="text-right">Total kWh</th>
                    <th class="text-right">Cost (MXN)</th>
                    <th class="text-right">Avg Daily kWh</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['per_device'] as $device)
                <tr>
                    <td>{{ $device['name'] }}</td>
                    <td>{{ $device['model'] }}</td>
                    <td class="text-right">{{ number_format($device['total_kwh'], 1) }}</td>
                    <td class="text-right">${{ number_format($device['cost_mxn'], 2) }}</td>
                    <td class="text-right">{{ number_format($device['avg_daily_kwh'], 1) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Daily Consumption</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="text-right">kWh</th>
                    <th class="text-right">Cost (MXN)</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($report['daily_totals'] as $day)
                <tr>
                    <td>{{ $day['date'] }}</td>
                    <td class="text-right">{{ number_format($day['total_kwh'], 1) }}</td>
                    <td class="text-right">${{ number_format($day['cost_mxn'], 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="footer">
        {{ config('app.name') }} — Energy Consumption Report — Confidential
    </div>
</div>
</body>
</html>
