<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure we have categories first
        $categories = Category::all();

        if ($categories->isEmpty()) {
            $this->command->error('No categories found. Please run CategorySeeder first.');
            return;
        }

        // Create 50 products with varied statuses and stock levels

        // 30 active products (20 in stock, 7 low stock, 3 out of stock)
        Product::factory()
            ->count(20)
            ->active()
            ->inStock()
            ->create();

        Product::factory()
            ->count(7)
            ->active()
            ->lowStock()
            ->create();

        Product::factory()
            ->count(3)
            ->active()
            ->outOfStock()
            ->create();

        // 10 inactive products (8 in stock, 2 low stock)
        Product::factory()
            ->count(8)
            ->inactive()
            ->inStock()
            ->create();

        Product::factory()
            ->count(2)
            ->inactive()
            ->lowStock()
            ->create();

        // 10 draft products (7 in stock, 1 low stock, 2 out of stock)
        Product::factory()
            ->count(7)
            ->draft()
            ->inStock()
            ->create();

        Product::factory()
            ->count(1)
            ->draft()
            ->lowStock()
            ->create();

        Product::factory()
            ->count(2)
            ->draft()
            ->outOfStock()
            ->create();

        $this->command->info('Created 50 products with varied statuses and stock levels.');
    }
}
