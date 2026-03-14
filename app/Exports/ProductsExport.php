<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    use Exportable;

    public function __construct(
        protected Builder $query
    ) {}

    /**
     * Get the query for the export.
     */
    public function query(): Builder
    {
        return $this->query;
    }

    /**
     * Get the headings for the export.
     */
    public function headings(): array
    {
        return [
            'ID',
            'SKU',
            'Name',
            'Description',
            'Category',
            'Price',
            'Stock',
            'Status',
            'Created At',
            'Updated At',
        ];
    }

    /**
     * Map the data for each row.
     */
    public function map($product): array
    {
        return [
            $product->id,
            $product->sku,
            $product->name,
            $product->description,
            $product->category?->name ?? 'N/A',
            $product->price,
            $product->stock,
            ucfirst($product->status),
            $product->created_at->format('Y-m-d H:i:s'),
            $product->updated_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Apply styles to the worksheet.
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            // Bold the header row
            1 => ['font' => ['bold' => true]],
        ];
    }
}
