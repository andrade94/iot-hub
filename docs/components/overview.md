# Component Library Overview

This starter template includes 90+ production-tested UI components from shadcn/ui plus custom enhancements.

## Component Categories

### Form Components

#### Basic Inputs
- `input` - Text input field
- `textarea` - Multi-line text input
- `checkbox` - Checkbox input
- `radio-group` - Radio button group
- `switch` - Toggle switch
- `label` - Form label

#### Specialized Inputs
- `currency-input` - Currency formatting with locale support
- `numeric-input` - Numeric validation with decimal support
- `number-input` - Integer input
- `phone-input` - Formatted phone number input
- `searchable-select` - Dropdown with search functionality
- `multi-select` - Multiple selection dropdown
- `select` - Standard dropdown
- `combobox` - Autocomplete dropdown

#### Date/Time
- `calendar` - Calendar widget
- `date-picker` - Single date selection
- `date-range-picker` - Date range with presets
- `time-picker` - Time selection
- `date-presets` - Quick date filters
- `date-filter` - Date filtering component

#### Form Integration
- `form` - Standard form components
- `form-rhf` - React Hook Form integration
  - FormProvider, FormField, FormItem, FormLabel, FormControl, FormMessage

### Display Components

#### Cards & Containers
- `card` - Card container with header, content, footer
- `container` - Content container with max-width
- `page-header` - Page header with title and actions
- `page-layout` - Standard page layout wrapper

#### Data Display
- `table` - Data table
- `data-table-column-header` - Sortable table headers
- `pagination` - Pagination controls
- `simple-pagination` - Simpler pagination variant
- `empty-state` - Empty state with icon and message
- `badge` - Status badge
- `avatar` - User avatar

#### Feedback
- `alert` - Alert message
- `toast` / `toaster` - Toast notifications
- `progress` - Progress bar
- `skeleton` - Loading skeleton
- `spinner` - Loading spinner

### Navigation Components

- `breadcrumb` - Breadcrumb navigation
- `navigation-menu` - Navigation menu
- `sidebar` - Sidebar navigation
- `dropdown-menu` - Dropdown menu
- `context-menu` - Right-click context menu

### Overlay Components

- `dialog` - Modal dialog
- `alert-dialog` - Confirmation dialog
- `sheet` - Slide-over panel
- `popover` - Popover overlay
- `tooltip` - Tooltip
- `command` - Command palette (⌘K menu)

### Layout Components

- `separator` - Visual separator
- `tabs` - Tabbed interface
- `accordion` - Collapsible sections
- `collapsible` - Collapsible content
- `scroll-area` - Custom scrollbar

### Button Components

- `button` - Button with variants
- `toggle` - Toggle button
- `toggle-group` - Toggle button group

### Other

- `error-boundary` - React error boundary
- `icon` - Icon wrapper (Lucide icons)
- `placeholder-pattern` - Placeholder pattern generator

## Usage Examples

### Currency Input

```tsx
import { CurrencyInput } from '@/components/ui/currency-input';

<CurrencyInput
    value={amount}
    onChange={setAmount}
    currency="USD"
    locale="en-US"
    placeholder="$0"
/>
```

### Searchable Select

```tsx
import { SearchableSelect } from '@/components/ui/searchable-select';

const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
];

<SearchableSelect
    options={options}
    value={selected}
    onValueChange={setSelected}
    placeholder="Select an option..."
    searchPlaceholder="Search..."
/>
```

### Date Range Picker

```tsx
import { DateRangePicker } from '@/components/ui/date-range-picker';

<DateRangePicker
    from={startDate}
    to={endDate}
    onSelect={(range) => {
        setStartDate(range?.from);
        setEndDate(range?.to);
    }}
/>
```

### Data Table with Pagination

```tsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

<Table>
    <TableHeader>
        <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
        </TableRow>
    </TableHeader>
    <TableBody>
        {users.map(user => (
            <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
            </TableRow>
        ))}
    </TableBody>
</Table>

<Pagination meta={paginationMeta} />
```

### Toast Notifications

```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
    title: 'Success!',
    description: 'Your changes have been saved.',
});

// Error toast
toast({
    title: 'Error',
    description: 'Something went wrong.',
    variant: 'destructive',
});
```

### Empty State

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';

<EmptyState
    icon={Inbox}
    title="No items found"
    description="Get started by creating a new item."
    action={{
        label: 'Create Item',
        onClick: () => router.visit('/items/create'),
    }}
/>
```

## Component Variants

Many components support variants for different styles:

### Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

## Customization

All components use Tailwind CSS and can be customized via:

1. **className prop** - Add custom classes
2. **cn() utility** - Merge classes conditionally
3. **Theme variables** - Modify in CSS variables
4. **Component source** - Edit directly in `resources/js/Components/ui/`

## Adding New Components

To add more shadcn/ui components:

```bash
# If using shadcn CLI
npx shadcn@latest add [component-name]

# Or add from shadcn/ui registry
npx shadcn@latest add [component]
```

## Component Documentation

For detailed component API and props, see:
- [shadcn/ui documentation](https://ui.shadcn.com)
- Component source files in `resources/js/components/ui/`
