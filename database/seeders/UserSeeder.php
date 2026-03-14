<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates test users for development and testing purposes.
     * All users use the password: "password"
     */
    public function run(): void
    {
        // Admin User - Verified
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        // Regular User - Verified
        $user = User::create([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $user->assignRole('user');

        // Editor User - Verified
        $editor = User::create([
            'name' => 'Editor User',
            'email' => 'editor@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $editor->assignRole('editor');

        // Unverified User - For testing email verification flow
        $unverified = User::create([
            'name' => 'Unverified User',
            'email' => 'unverified@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => null, // Not verified
        ]);
        $unverified->assignRole('user');

        // Optionally create additional random users using factory
        // User::factory(10)->create();

        $this->command->info('✓ Created 4 test users with roles');
        $this->command->info('  Admin: admin@example.com / password (admin role)');
        $this->command->info('  Editor: editor@example.com / password (editor role)');
        $this->command->info('  User: user@example.com / password (user role)');
        $this->command->info('  Unverified: unverified@example.com / password (user role)');
    }
}
