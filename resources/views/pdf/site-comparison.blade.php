@extends('pdf.layout')

@section('title', 'Site Comparison Report')

@section('content')
<h1 style="font-size: 20px; margin-bottom: 4px;">Site Comparison Report</h1>
<p style="color: #666; font-size: 12px; margin-bottom: 20px;">
    {{ $orgName }} &mdash; Last {{ $days }} days &mdash; Generated {{ $generatedAt }}
</p>

<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
    <thead>
        <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 6px 8px; text-align: left;">Rank</th>
            <th style="padding: 6px 8px; text-align: left;">Site</th>
            <th style="padding: 6px 8px; text-align: right;">Composite</th>
            <th style="padding: 6px 8px; text-align: right;">Uptime</th>
            <th style="padding: 6px 8px; text-align: right;">SLA</th>
            <th style="padding: 6px 8px; text-align: right;">MTTR</th>
            <th style="padding: 6px 8px; text-align: right;">Alerts</th>
            <th style="padding: 6px 8px; text-align: right;">WOs</th>
            <th style="padding: 6px 8px; text-align: right;">Compliance</th>
            <th style="padding: 6px 8px; text-align: right;">Devices</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rankings as $i => $r)
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 8px; font-weight: 600;">{{ $i + 1 }}</td>
            <td style="padding: 6px 8px; font-weight: 500;">{{ $r['site_name'] }}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700;">{{ $r['composite'] }}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['uptime_pct'] }}%</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['sla_pct'] }}%</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['mttr_minutes'] !== null ? round($r['mttr_minutes']) . 'm' : '—' }}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['alert_count'] }}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['wo_completed'] }}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['compliance_ytd_pct'] }}%</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">{{ $r['device_count'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<p style="color: #999; font-size: 9px; margin-top: 16px;">
    Composite score weights: Uptime 25% · SLA 30% · Alert rate 20% · MTTR 15% · Compliance 10%
</p>

<p style="color: #999; font-size: 10px; margin-top: 20px; text-align: center;">
    Astrea IoT Platform &mdash; Confidential
</p>
@endsection
