<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PartnerController extends Controller
{
    public function index(Request $request)
    {
        $organizations = Organization::select('id', 'name', 'slug', 'logo', 'branding')
            ->orderBy('name')
            ->get();

        return Inertia::render('partner/index', [
            'organizations' => $organizations,
        ]);
    }
}
