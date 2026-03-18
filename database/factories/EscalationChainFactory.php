<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EscalationChain>
 */
class EscalationChainFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'name' => fake()->words(3, true) . ' escalation',
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 0,
                    'channels' => ['push', 'email'],
                    'notify_roles' => ['technician'],
                ],
                [
                    'level' => 2,
                    'delay_minutes' => 15,
                    'channels' => ['push', 'email', 'sms'],
                    'notify_roles' => ['supervisor'],
                ],
                [
                    'level' => 3,
                    'delay_minutes' => 30,
                    'channels' => ['push', 'email', 'sms', 'whatsapp'],
                    'notify_roles' => ['manager'],
                ],
            ],
        ];
    }
}
