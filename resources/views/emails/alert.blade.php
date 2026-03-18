@extends('emails.layout')

@section('content')
<h2 style="margin-bottom: 15px; color: {{ $severity === 'critical' ? '#dc2626' : ($severity === 'high' ? '#d97706' : '#333') }};">
    {{ strtoupper($severity) }} Alert
</h2>

<table style="width: 100%; margin-bottom: 20px;">
    <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-weight: bold;">Site</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
            {{ $siteName }}
        </td>
    </tr>
    <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-weight: bold;">Device</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
            {{ $deviceName }}
        </td>
    </tr>
    @if($metric)
    <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-weight: bold;">Metric</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
            {{ $metric }}
        </td>
    </tr>
    @endif
    @if($value !== null && $threshold !== null)
    <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-weight: bold;">Reading</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
            {{ $value }} (threshold: {{ $threshold }})
        </td>
    </tr>
    @endif
    <tr>
        <td style="padding: 8px 0;">
            <span style="color: #666; font-weight: bold;">Triggered</span>
        </td>
        <td style="padding: 8px 0; text-align: right;">
            {{ $triggeredAt->format('M j, Y g:i A') }}
        </td>
    </tr>
</table>

<div style="text-align: center; margin-top: 20px;">
    <a href="{{ $appUrl }}/alerts/{{ $alert->id }}"
       style="display: inline-block; padding: 10px 24px; background-color: {{ $severity === 'critical' ? '#dc2626' : '#1a1a1a' }}; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
        View Alert
    </a>
</div>
@endsection
