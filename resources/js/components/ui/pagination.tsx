import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { forwardRef } from 'react';

const paginationVariants = cva(
    'mx-auto flex w-full justify-center',
);

const paginationContentVariants = cva(
    'flex flex-row items-center gap-1',
);

const paginationItemVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'hover:bg-accent hover:text-accent-foreground',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 px-3',
                lg: 'h-11 px-8',
                icon: 'h-10 w-10',
            },
            isActive: {
                true: 'bg-primary text-primary-foreground hover:bg-primary/90',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'icon',
            isActive: false,
        },
    }
);

export interface PaginationProps extends React.ComponentProps<'nav'> {}

const Pagination = ({ className, ...props }: PaginationProps) => (
    <nav
        role="navigation"
        aria-label="pagination"
        className={cn(paginationVariants(), className)}
        {...props}
    />
);

const PaginationContent = forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
    ({ className, ...props }, ref) => (
        <ul
            ref={ref}
            className={cn(paginationContentVariants(), className)}
            {...props}
        />
    )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
    ({ className, ...props }, ref) => (
        <li ref={ref} className={cn('', className)} {...props} />
    )
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
    isActive?: boolean;
} & Pick<VariantProps<typeof paginationItemVariants>, 'size'> &
    React.ComponentProps<'a'>;

const PaginationLink = ({
    className,
    isActive,
    size = 'icon',
    ...props
}: PaginationLinkProps) => (
    <a
        aria-current={isActive ? 'page' : undefined}
        className={cn(
            paginationItemVariants({
                variant: isActive ? undefined : 'ghost',
                size,
                isActive,
            }),
            className
        )}
        {...props}
    />
);

const PaginationPrevious = ({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to previous page"
        size="default"
        className={cn('gap-1 pl-2.5', className)}
        {...props}
    >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
    </PaginationLink>
);

const PaginationNext = ({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to next page"
        size="default"
        className={cn('gap-1 pr-2.5', className)}
        {...props}
    >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
    </PaginationLink>
);

const PaginationEllipsis = ({
    className,
    ...props
}: React.ComponentProps<'span'>) => (
    <span
        aria-hidden
        className={cn('flex h-9 w-9 items-center justify-center', className)}
        {...props}
    >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">More pages</span>
    </span>
);

export interface PaginationInfoProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    className?: string;
    id?: string;
}

const PaginationInfo = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    className,
    id = 'pagination-info',
}: PaginationInfoProps) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div 
            id={id}
            className={cn('text-sm text-muted-foreground', className)}
            role="status"
            aria-live="polite"
            aria-label={`Showing items ${startItem} to ${endItem} of ${totalItems} total results`}
        >
            Showing {startItem} to {endItem} of {totalItems} results
        </div>
    );
};

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationInfo,
};