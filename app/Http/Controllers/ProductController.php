<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Transform Laravel paginator to match frontend PaginatedResponse interface
     */
    private function formatPaginatorForInertia(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => $paginator->items(),
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::with('category');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($status = $request->input('status')) {
            $statusArray = is_array($status) ? $status : explode(',', $status);
            $query->whereIn('status', $statusArray);
        }

        // Filter by categories
        if ($categories = $request->input('categories')) {
            $categoriesArray = is_array($categories) ? $categories : explode(',', $categories);
            $query->whereIn('category_id', $categoriesArray);
        }

        // Filter by price range
        if ($priceMin = $request->input('price_min')) {
            $query->where('price', '>=', $priceMin);
        }
        if ($priceMax = $request->input('price_max')) {
            $query->where('price', '<=', $priceMax);
        }

        // Filter by date range
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Sorting - whitelist allowed columns to prevent SQL injection
        $allowedSortColumns = ['created_at', 'updated_at', 'name', 'sku', 'price', 'stock', 'status'];
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        if (! in_array($sortBy, $allowedSortColumns, true)) {
            $sortBy = 'created_at';
        }
        if (! in_array($sortOrder, ['asc', 'desc'], true)) {
            $sortOrder = 'desc';
        }

        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $paginator = $query->paginate(12)->withQueryString();

        // Stats - single aggregation query instead of 4 separate queries
        $statsQuery = Product::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN stock > 0 AND stock < 10 THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
        ")->first();

        $stats = [
            'total' => (int) $statsQuery->total,
            'active' => (int) $statsQuery->active,
            'low_stock' => (int) $statsQuery->low_stock,
            'out_of_stock' => (int) $statsQuery->out_of_stock,
        ];

        // All categories for filters
        $categories = Category::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Products/Index', [
            'products' => $this->formatPaginatorForInertia($paginator),
            'stats' => $stats,
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'categories', 'price_min', 'price_max', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $categories = Category::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Products/Create', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductRequest $request)
    {
        Product::create($request->validated());

        return redirect()
            ->route('products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        $product->load('category');

        return Inertia::render('Products/Show', [
            'product' => $product,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product)
    {
        $categories = Category::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Products/Edit', [
            'product' => $product->load('category'),
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return redirect()
            ->route('products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return redirect()
            ->route('products.index')
            ->with('success', 'Product deleted successfully.');
    }

    /**
     * Bulk update product status.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['uuid', 'exists:products,id'],
            'status' => ['required', 'in:active,inactive,draft'],
        ]);

        $count = Product::whereIn('id', $request->ids)->update([
            'status' => $request->status,
        ]);

        return redirect()
            ->back()
            ->with('success', "Updated status for {$count} product(s).");
    }

    /**
     * Bulk delete products.
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['uuid', 'exists:products,id'],
        ]);

        $count = Product::whereIn('id', $request->ids)->delete();

        return redirect()
            ->back()
            ->with('success', "Deleted {$count} product(s).");
    }
}
