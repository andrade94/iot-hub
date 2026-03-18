@extends('emails.layout')

@section('content')
    <h1>Compliance Reminder</h1>

    <p>This is a reminder that the following compliance event is due in <strong>{{ $daysUntilDue }} day{{ $daysUntilDue !== 1 ? 's' : '' }}</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Event</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $event->title }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Type</td>
            <td style="padding: 12px; border: 1px solid #eee;">
                @switch($event->type)
                    @case('cofepris_audit')
                        <span style="display: inline-block; padding: 2px 8px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; font-size: 13px;">COFEPRIS Audit</span>
                        @break
                    @case('certificate_renewal')
                        <span style="display: inline-block; padding: 2px 8px; background-color: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 13px;">Certificate Renewal</span>
                        @break
                    @case('calibration')
                        <span style="display: inline-block; padding: 2px 8px; background-color: #fef3c7; color: #92400e; border-radius: 4px; font-size: 13px;">Calibration</span>
                        @break
                    @case('inspection')
                        <span style="display: inline-block; padding: 2px 8px; background-color: #e0e7ff; color: #3730a3; border-radius: 4px; font-size: 13px;">Inspection</span>
                        @break
                    @case('permit_renewal')
                        <span style="display: inline-block; padding: 2px 8px; background-color: #d1fae5; color: #065f46; border-radius: 4px; font-size: 13px;">Permit Renewal</span>
                        @break
                    @default
                        <span style="display: inline-block; padding: 2px 8px; background-color: #f3f4f6; color: #374151; border-radius: 4px; font-size: 13px;">{{ ucfirst(str_replace('_', ' ', $event->type)) }}</span>
                @endswitch
            </td>
        </tr>
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Site</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">{{ $siteName }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #eee; font-weight: 600;">Due Date</td>
            <td style="padding: 12px; border: 1px solid #eee;">{{ $event->due_date->format('F j, Y') }}</td>
        </tr>
        <tr>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee; font-weight: 600;">Days Remaining</td>
            <td style="padding: 12px; background-color: #f9f9f9; border: 1px solid #eee;">
                @if($daysUntilDue <= 1)
                    <span style="color: #dc2626; font-weight: 600;">{{ $daysUntilDue }} day{{ $daysUntilDue !== 1 ? 's' : '' }}</span>
                @elseif($daysUntilDue <= 7)
                    <span style="color: #d97706; font-weight: 600;">{{ $daysUntilDue }} days</span>
                @else
                    <span>{{ $daysUntilDue }} days</span>
                @endif
            </td>
        </tr>
    </table>

    @if($event->description)
        <p><strong>Description:</strong> {{ $event->description }}</p>
    @endif

    <p style="text-align: center;">
        <a href="{{ $calendarUrl }}" class="button">View Compliance Calendar</a>
    </p>

    <p>Best regards,<br>The {{ $appName }} Team</p>
@endsection
