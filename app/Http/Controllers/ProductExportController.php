<?php

namespace App\Http\Controllers;

use App\Exports\ProductsExport;
use App\Jobs\ExportProductsJob;
use App\Models\Product;
use App\Services\PdfService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductExportController extends Controller
{
    public function __construct(
        protected PdfService $pdfService
    ) {}

    /**
     * Export single product to PDF.
     */
    public function pdf(Request $request, Product $product)
    {
        $download = $request->boolean('download', true);

        return $this->pdfService->productPdf($product, $download);
    }

    /**
     * Export multiple products to PDF.
     */
    public function bulkPdf(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'string|exists:products,id',
        ]);

        $products = Product::with('category')
            ->whereIn('id', $request->input('ids'))
            ->get();

        if ($products->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No products found.',
            ], 404);
        }

        $download = $request->boolean('download', true);

        return $this->pdfService->productsBulkPdf($products, $download);
    }

    /**
     * Export products to Excel/CSV.
     */
    public function excel(Request $request): BinaryFileResponse
    {
        $request->validate([
            'format' => 'sometimes|in:xlsx,csv',
            'ids' => 'sometimes|array',
            'ids.*' => 'string|exists:products,id',
        ]);

        $format = $request->input('format', 'xlsx');
        $ids = $request->input('ids');

        // Build query with filters from request
        $query = Product::with('category');

        // Filter by IDs if provided
        if ($ids) {
            $query->whereIn('id', $ids);
        }

        // Apply same filters as index page
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category_id')) {
            $categoryIds = is_array($request->input('category_id'))
                ? $request->input('category_id')
                : [$request->input('category_id')];
            $query->whereIn('category_id', $categoryIds);
        }

        // Check if we need to queue the export
        $count = $query->count();

        if ($count > 1000) {
            // Queue the export for large datasets
            ExportProductsJob::dispatch(
                $request->user(),
                $request->all(),
                $format
            );

            return response()->json([
                'success' => true,
                'queued' => true,
                'message' => "Exporting {$count} products. You'll be notified when it's ready.",
            ]);
        }

        $filename = 'products-'.now()->format('Y-m-d').'.'.$format;
        $exportType = $format === 'csv'
            ? \Maatwebsite\Excel\Excel::CSV
            : \Maatwebsite\Excel\Excel::XLSX;

        // Log the export
        activity()
            ->causedBy($request->user())
            ->withProperties([
                'format' => $format,
                'count' => $count,
            ])
            ->log('Products exported');

        return Excel::download(new ProductsExport($query), $filename, $exportType);
    }
}
