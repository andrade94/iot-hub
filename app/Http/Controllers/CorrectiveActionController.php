<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCorrectiveActionRequest;
use App\Models\Alert;
use App\Models\CorrectiveAction;

class CorrectiveActionController extends Controller
{
    public function store(StoreCorrectiveActionRequest $request, Alert $alert)
    {
        CorrectiveAction::create([
            'alert_id' => $alert->id,
            'site_id' => $alert->site_id,
            'action_taken' => $request->validated('action_taken'),
            'notes' => $request->validated('notes'),
            'status' => 'logged',
            'taken_by' => $request->user()->id,
            'taken_at' => now(),
        ]);

        return back()->with('success', 'Corrective action logged.');
    }

    public function verify(Alert $alert, CorrectiveAction $correctiveAction)
    {
        $this->authorize('verify', $correctiveAction);

        $correctiveAction->verify(auth()->id());

        return back()->with('success', 'Corrective action verified.');
    }
}
