<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\File>
 */
class FileFactory extends Factory
{
    public function definition(): array
    {
        $extension = fake()->randomElement(['jpg', 'png', 'pdf', 'docx', 'xlsx']);
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        $originalName = fake()->word() . '.' . $extension;

        return [
            'user_id' => User::factory(),
            'original_name' => $originalName,
            'filename' => fake()->uuid() . '.' . $extension,
            'path' => 'uploads/' . fake()->uuid() . '.' . $extension,
            'disk' => 'local',
            'mime_type' => $mimeTypes[$extension],
            'size' => fake()->numberBetween(1024, 10485760),
            'extension' => $extension,
            'visibility' => fake()->randomElement(['public', 'private']),
            'thumbnail_path' => null,
            'metadata' => [],
            'fileable_type' => null,
            'fileable_id' => null,
        ];
    }

    public function image(): static
    {
        return $this->state(fn (array $attributes) => [
            'extension' => 'jpg',
            'mime_type' => 'image/jpeg',
            'original_name' => fake()->word() . '.jpg',
        ]);
    }

    public function pdf(): static
    {
        return $this->state(fn (array $attributes) => [
            'extension' => 'pdf',
            'mime_type' => 'application/pdf',
            'original_name' => fake()->word() . '.pdf',
        ]);
    }
}
