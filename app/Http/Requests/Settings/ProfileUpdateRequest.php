<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],

            'quiet_hours_start' => ['nullable', 'date_format:H:i'],
            'quiet_hours_end' => ['nullable', 'date_format:H:i', 'different:quiet_hours_start'],
            'quiet_hours_tz' => ['nullable', 'timezone'],

            'whatsapp_phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?[1-9]\d{6,14}$/'],
            'notify_whatsapp' => ['nullable', 'boolean'],
            'notify_push' => ['nullable', 'boolean'],
            'notify_email' => ['nullable', 'boolean'],
            'notify_min_severity' => ['nullable', 'string', 'in:low,medium,high,critical'],
        ];
    }
}
