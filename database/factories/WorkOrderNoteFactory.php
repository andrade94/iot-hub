<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkOrderNote>
 */
class WorkOrderNoteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'work_order_id' => WorkOrder::factory(),
            'user_id' => User::factory(),
            'note' => fake()->paragraph(),
        ];
    }
}
