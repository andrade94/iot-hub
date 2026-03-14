import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimplePaginationProps {
    from: number;
    to: number;
    total: number;
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
}

export function SimplePagination({ from, to, total, currentPage, lastPage, onPageChange }: SimplePaginationProps) {
    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(lastPage, start + maxVisible - 1);

        if (end - start + 1 < maxVisible && start > 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                Mostrando {from} a {to} de {total} resultados
            </div>

            {lastPage > 1 && (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                        {getVisiblePages().map((page) => (
                            <Button
                                key={page}
                                variant={page === currentPage ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onPageChange(page)}
                                className="min-w-[32px]"
                            >
                                {page}
                            </Button>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= lastPage}>
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
