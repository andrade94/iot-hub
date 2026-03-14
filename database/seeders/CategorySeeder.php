<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Electronics',
                'description' => 'Electronic devices, gadgets, and accessories for modern living.',
            ],
            [
                'name' => 'Clothing',
                'description' => 'Fashion apparel and accessories for all styles and occasions.',
            ],
            [
                'name' => 'Books',
                'description' => 'Literature, educational materials, and reading entertainment.',
            ],
            [
                'name' => 'Home & Garden',
                'description' => 'Home improvement, furniture, and gardening supplies.',
            ],
            [
                'name' => 'Sports & Outdoors',
                'description' => 'Athletic equipment and outdoor recreation gear.',
            ],
            [
                'name' => 'Toys & Games',
                'description' => 'Entertainment and educational toys for all ages.',
            ],
            [
                'name' => 'Beauty & Personal Care',
                'description' => 'Cosmetics, skincare, and personal care products.',
            ],
            [
                'name' => 'Food & Beverages',
                'description' => 'Gourmet foods, snacks, and specialty beverages.',
            ],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
