<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Global search endpoint.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
            'type' => 'sometimes|string|in:all,products',
            'limit' => 'sometimes|integer|min:1|max:50',
        ]);

        $query = $request->input('q');
        $type = $request->input('type', 'all');
        $limit = $request->input('limit', 10);

        $results = [];

        if ($type === 'all' || $type === 'products') {
            $products = Product::search($query)
                ->take($limit)
                ->get()
                ->map(fn ($product) => [
                    'id' => $product->id,
                    'type' => 'product',
                    'title' => $product->name,
                    'subtitle' => $product->sku ?? 'No SKU',
                    'description' => \Str::limit($product->description, 100),
                    'url' => route('products.show', $product),
                    'image' => $product->image_url,
                    'meta' => [
                        'price' => $product->formatted_price,
                        'status' => $product->status,
                        'stock' => $product->stock,
                    ],
                ]);

            $results['products'] = $products;
        }

        return response()->json([
            'query' => $query,
            'results' => $results,
            'total' => collect($results)->flatten(1)->count(),
        ]);
    }

    /**
     * Search products specifically.
     */
    public function products(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
            'limit' => 'sometimes|integer|min:1|max:50',
            'status' => 'sometimes|string|in:active,inactive,draft',
            'category_id' => 'sometimes|string|exists:categories,id',
        ]);

        $query = $request->input('q');
        $limit = $request->input('limit', 20);

        $search = Product::search($query);

        // Scout doesn't support where clauses directly for all drivers
        // For database driver, we can use query callback
        $results = $search->query(function ($builder) use ($request) {
            if ($request->filled('status')) {
                $builder->where('status', $request->input('status'));
            }
            if ($request->filled('category_id')) {
                $builder->where('category_id', $request->input('category_id'));
            }

            return $builder->with('category');
        })
            ->take($limit)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'description' => \Str::limit($product->description, 100),
                'price' => $product->price,
                'formatted_price' => $product->formatted_price,
                'stock' => $product->stock,
                'status' => $product->status,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,
                'image_url' => $product->image_url,
                'url' => route('products.show', $product),
            ]);

        return response()->json([
            'query' => $query,
            'results' => $results,
            'total' => $results->count(),
        ]);
    }

    /**
     * Typeahead/autocomplete search.
     */
    public function typeahead(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:1|max:100',
            'limit' => 'sometimes|integer|min:1|max:10',
        ]);

        $query = $request->input('q');
        $limit = $request->input('limit', 5);

        $results = Product::search($query)
            ->take($limit)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'label' => $product->name,
                'value' => $product->id,
                'subtitle' => $product->sku,
            ]);

        return response()->json($results);
    }
}
