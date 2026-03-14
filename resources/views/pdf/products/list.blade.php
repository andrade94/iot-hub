@extends('pdf.layout')

@section('content')
    <h2 class="mb-10">Products List</h2>
    <p class="mb-20" style="color: #666;">Total: {{ $products->count() }} product(s)</p>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th class="text-right">Price</th>
                <th class="text-center">Stock</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($products as $product)
                <tr>
                    <td>{{ $product->sku ?? 'N/A' }}</td>
                    <td>{{ $product->name }}</td>
                    <td>{{ $product->category?->name ?? 'Uncategorized' }}</td>
                    <td class="text-right">${{ number_format($product->price, 2) }}</td>
                    <td class="text-center">
                        {{ $product->stock }}
                        @if($product->stock == 0)
                            <span class="badge badge-inactive">Out</span>
                        @elseif($product->stock < 10)
                            <span class="badge badge-low-stock">Low</span>
                        @endif
                    </td>
                    <td class="text-center">
                        @if($product->status === 'active')
                            <span class="badge badge-active">Active</span>
                        @else
                            <span class="badge badge-inactive">{{ ucfirst($product->status) }}</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if($products->count() > 0)
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <table style="margin-bottom: 0;">
                <tr>
                    <td><strong>Summary</strong></td>
                    <td class="text-right">
                        Total Value: <strong>${{ number_format($products->sum('price'), 2) }}</strong>
                    </td>
                    <td class="text-right">
                        Total Stock: <strong>{{ $products->sum('stock') }}</strong>
                    </td>
                    <td class="text-right">
                        Active: <strong>{{ $products->where('status', 'active')->count() }}</strong>
                    </td>
                </tr>
            </table>
        </div>
    @endif
@endsection
