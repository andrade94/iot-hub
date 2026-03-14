@extends('pdf.layout')

@section('content')
    <h2 class="mb-20">Product Details</h2>

    <table>
        <tr>
            <td class="label" width="30%">Product ID</td>
            <td class="value">{{ $product->id }}</td>
        </tr>
        <tr>
            <td class="label">SKU</td>
            <td class="value">{{ $product->sku ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td class="label">Name</td>
            <td class="value">{{ $product->name }}</td>
        </tr>
        <tr>
            <td class="label">Description</td>
            <td class="value">{{ $product->description ?? 'No description' }}</td>
        </tr>
        <tr>
            <td class="label">Category</td>
            <td class="value">{{ $product->category?->name ?? 'Uncategorized' }}</td>
        </tr>
        <tr>
            <td class="label">Price</td>
            <td class="value">${{ number_format($product->price, 2) }}</td>
        </tr>
        <tr>
            <td class="label">Stock</td>
            <td class="value">
                {{ $product->stock }}
                @if($product->stock == 0)
                    <span class="badge badge-inactive">Out of Stock</span>
                @elseif($product->stock < 10)
                    <span class="badge badge-low-stock">Low Stock</span>
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Status</td>
            <td class="value">
                @if($product->status === 'active')
                    <span class="badge badge-active">Active</span>
                @else
                    <span class="badge badge-inactive">{{ ucfirst($product->status) }}</span>
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Created At</td>
            <td class="value">{{ $product->created_at->format('F j, Y \a\t g:i A') }}</td>
        </tr>
        <tr>
            <td class="label">Last Updated</td>
            <td class="value">{{ $product->updated_at->format('F j, Y \a\t g:i A') }}</td>
        </tr>
    </table>
@endsection
