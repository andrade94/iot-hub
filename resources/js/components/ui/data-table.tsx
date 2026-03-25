import * as React from 'react';
import {
    type ColumnDef,
    type ColumnFiltersState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowSelectionChange?: (selectedRows: TData[]) => void;
    onRowClick?: (row: TData) => void;
    rowClassName?: (row: TData) => string;
    getRowId?: (row: TData) => string;
    showColumnToggle?: boolean;
    noResultsMessage?: string;
    emptyState?: React.ReactNode;
    bordered?: boolean;
    /** Controlled row selection state (keys are row IDs from getRowId) */
    rowSelection?: RowSelectionState;
    /** Callback when controlled row selection changes */
    onRowSelectionStateChange?: (state: RowSelectionState) => void;
    /** Control which rows can be selected (return false to disable selection) */
    enableRowSelection?: boolean | ((row: TData) => boolean);
}

function DataTable<TData, TValue>({
    columns,
    data,
    onRowSelectionChange,
    onRowClick,
    rowClassName,
    getRowId,
    showColumnToggle = false,
    noResultsMessage = 'No results.',
    emptyState,
    bordered = true,
    rowSelection: controlledRowSelection,
    onRowSelectionStateChange,
    enableRowSelection,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});

    const isControlled = controlledRowSelection !== undefined;
    const rowSelection = isControlled ? controlledRowSelection : internalRowSelection;

    const table = useReactTable({
        data,
        columns,
        ...(getRowId ? { getRowId } : {}),
        ...(enableRowSelection !== undefined
            ? {
                  enableRowSelection:
                      typeof enableRowSelection === 'function'
                          ? (row: { original: TData }) => enableRowSelection(row.original)
                          : enableRowSelection,
              }
            : {}),
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: (updater) => {
            const next = typeof updater === 'function' ? updater(rowSelection) : updater;
            if (isControlled) {
                onRowSelectionStateChange?.(next);
            } else {
                setInternalRowSelection(next);
            }
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    // Notify parent of selection changes (uncontrolled mode only)
    React.useEffect(() => {
        if (onRowSelectionChange && !isControlled) {
            const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
            onRowSelectionChange(selectedRows);
        }
    }, [rowSelection, table, onRowSelectionChange, isControlled]);

    return (
        <div className="space-y-4">
            {showColumnToggle && (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Columns
                                <ChevronDown className="ml-1.5 size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            <div className={bordered ? 'overflow-hidden rounded-lg border' : ''}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={
                                            (header.column.columnDef.meta as Record<string, string> | undefined)
                                                ?.className
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={[
                                        onRowClick ? 'cursor-pointer' : '',
                                        rowClassName ? rowClassName(row.original) : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={
                                                (cell.column.columnDef.meta as Record<string, string> | undefined)
                                                    ?.className
                                            }
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className={emptyState ? 'p-0' : 'h-24 text-center'}>
                                    {emptyState ?? noResultsMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
            )}
        </div>
    );
}

export { DataTable };
export type { DataTableProps };
