<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkOrderPhoto>
 */
class WorkOrderPhotoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'work_order_id' => WorkOrder::factory(),
            'photo_path' => 'work-orders/photos/' . fake()->uuid() . '.jpg',
            'caption' => fake()->optional(0.7)->sentence(),
            'uploaded_by' => User::factory(),
            'uploaded_at' => fake()->dateTimeBetween('-30 days'),
        ];
    }
}
