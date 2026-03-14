<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class LocaleController extends Controller
{
    /**
     * Available locales
     *
     * @var array<string>
     */
    protected array $availableLocales = ['en', 'es'];

    /**
     * Update the user's locale preference
     */
    public function update(Request $request): RedirectResponse
    {
        $locale = $request->input('locale');

        if (in_array($locale, $this->availableLocales, true)) {
            // Store in session
            Session::put('locale', $locale);

            // Optionally store in user model if authenticated
            if ($request->user() && method_exists($request->user(), 'setLocale')) {
                $request->user()->setLocale($locale);
                $request->user()->save();
            }
        }

        return back();
    }
}
