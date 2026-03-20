<?php

namespace Database\Factories;

use App\Models\Alert;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CorrectiveAction>
 */
class CorrectiveActionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'alert_id' => Alert::factory(),
            'site_id' => Site::factory(),
            'action_taken' => fake()->randomElement([
                'Moved product to backup cooler immediately. Checked compressor — running but not cooling. Called technician.',
                'Verified sensor reading against manual thermometer — confirmed excursion. Relocated perishables to adjacent unit.',
                'Turned off defrost cycle manually. Temperature returned to range within 15 minutes. Logged in maintenance book.',
                'Power outage detected. Activated backup generator. Verified all cold chain units resumed within 5 minutes.',
                'Door left open by delivery crew. Closed door, verified temperature recovery. Retrained staff on door protocol.',
                'Compressor failure confirmed. Emergency service called. Product moved to walk-in #2. Estimated repair: 4 hours.',
            ]),
            'notes' => fake()->optional(0.4)->sentence(),
            'status' => 'logged',
            'taken_by' => User::factory(),
            'taken_at' => fake()->dateTimeBetween('-7 days'),
            'verified_by' => null,
            'verified_at' => null,
        ];
    }

    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'verified',
            'verified_by' => User::factory(),
            'verified_at' => fake()->dateTimeBetween('-3 days'),
        ]);
    }
}
