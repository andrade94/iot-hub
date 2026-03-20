<?php

namespace App\Http\Requests;

use App\Models\CorrectiveAction;
use Illuminate\Foundation\Http\FormRequest;

class StoreCorrectiveActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [CorrectiveAction::class, $this->route('alert')]);
    }

    public function rules(): array
    {
        return [
            'action_taken' => ['required', 'string', 'min:10', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'action_taken.min' => 'Describe the corrective action taken (at least 10 characters).',
            'action_taken.required' => 'A description of the corrective action is required.',
        ];
    }
}
