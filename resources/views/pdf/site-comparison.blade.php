@extends('pdf.layout')

@section('title', 'Site Comparison Report')

@section('content')
<h1 style="font-size: 20px; margin-bottom: 4px;">Site Comparison Report</h1>
<p style="color: #666; font-size: 12px; margin-bottom: 20px;">
    {{ $orgName }} &mdash; {{ ucfirst($metric) }} &mdash; Last {{ $days }} days &mdash; Generated {{ $generatedAt }}
</p>

<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead>
        <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; text-align: left;">Rank</th>
            <th style="padding: 8px; text-align: left;">Site</th>
            <th style="padding: 8px; text-align: right;">{{ ucfirst(str_replace('_', ' ', $metric)) }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rankings as $i => $r)
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px;">{{ $i + 1 }}</td>
            <td style="padding: 8px; font-weight: 500;">{{ $r['site_name'] }}</td>
            <td style="padding: 8px; text-align: right; font-family: monospace;">
                @if (in_array($metric, ['compliance', 'device_uptime']))
                    {{ $r['value'] }}%
                @elseif ($metric === 'response_time')
                    {{ $r['value'] }} min
                @else
                    {{ $r['value'] }}
                @endif
            </td>
        </tr>
        @endforeach
    </tbody>
</table>

<p style="color: #999; font-size: 10px; margin-top: 20px; text-align: center;">
    Astrea IoT Platform &mdash; Confidential
</p>
@endsection
