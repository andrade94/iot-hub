<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class PdfService
{
    /**
     * Default PDF options.
     */
    protected array $defaultOptions = [
        'paper' => 'a4',
        'orientation' => 'portrait',
    ];

    /**
     * Generate a PDF from a view.
     */
    public function generate(
        string $view,
        array $data = [],
        array $options = []
    ): \Barryvdh\DomPDF\PDF {
        $options = array_merge($this->defaultOptions, $options);

        $pdf = Pdf::loadView($view, $data);

        $pdf->setPaper($options['paper'], $options['orientation']);

        return $pdf;
    }

    /**
     * Generate and stream a PDF (inline display).
     */
    public function stream(
        string $view,
        array $data = [],
        string $filename = 'document.pdf',
        array $options = []
    ): Response {
        $pdf = $this->generate($view, $data, $options);

        return $pdf->stream($filename);
    }

    /**
     * Generate and download a PDF.
     */
    public function download(
        string $view,
        array $data = [],
        string $filename = 'document.pdf',
        array $options = []
    ): Response {
        $pdf = $this->generate($view, $data, $options);

        return $pdf->download($filename);
    }

    /**
     * Generate PDF and save to storage.
     */
    public function save(
        string $view,
        array $data = [],
        string $path = 'pdfs/document.pdf',
        string $disk = 'local',
        array $options = []
    ): string {
        $pdf = $this->generate($view, $data, $options);

        \Illuminate\Support\Facades\Storage::disk($disk)->put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate product PDF.
     */
    public function productPdf(
        $product,
        bool $download = true
    ): Response {
        $data = [
            'product' => $product,
            'generatedAt' => now(),
            'appName' => config('app.name'),
        ];

        $filename = 'product-'.($product->sku ?? $product->id).'.pdf';

        return $download
            ? $this->download('pdf.products.single', $data, $filename)
            : $this->stream('pdf.products.single', $data, $filename);
    }

    /**
     * Generate bulk products PDF.
     */
    public function productsBulkPdf(
        Collection $products,
        bool $download = true
    ): Response {
        $data = [
            'products' => $products,
            'generatedAt' => now(),
            'appName' => config('app.name'),
        ];

        $filename = 'products-'.now()->format('Y-m-d').'.pdf';

        return $download
            ? $this->download('pdf.products.list', $data, $filename, ['orientation' => 'landscape'])
            : $this->stream('pdf.products.list', $data, $filename, ['orientation' => 'landscape']);
    }
}
