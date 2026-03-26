@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (trim($slot) === 'Laravel' || trim($slot) === 'Astrea IoT Platform')
<div style="display: inline-flex; align-items: center; gap: 10px;">
    <div style="width: 40px; height: 40px; background: #10b981; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    </div>
    <div style="text-align: left;">
        <div style="font-size: 18px; font-weight: 700; color: #18181b; letter-spacing: -0.01em;">Astrea</div>
        <div style="font-size: 10px; font-weight: 500; color: #71717a; letter-spacing: 0.05em; text-transform: uppercase;">IoT Platform</div>
    </div>
</div>
@else
{!! $slot !!}
@endif
</a>
</td>
</tr>
