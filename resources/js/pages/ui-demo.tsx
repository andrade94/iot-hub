/**
 * UI Components Demo Page
 *
 * Showcase of premium UI components with the Bold & Modern styling
 */

import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowRight,
    Bell,
    Check,
    ChevronRight,
    Download,
    Heart,
    Loader2,
    Mail,
    Plus,
    Search,
    Settings,
    Trash2,
    Upload,
    Zap,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    XAxis,
    YAxis,
} from 'recharts';

// Chart data
const barChartData = [
    { month: 'Jan', revenue: 4000, expenses: 2400 },
    { month: 'Feb', revenue: 3000, expenses: 1398 },
    { month: 'Mar', revenue: 9800, expenses: 2000 },
    { month: 'Apr', revenue: 3908, expenses: 2780 },
    { month: 'May', revenue: 4800, expenses: 1890 },
    { month: 'Jun', revenue: 3800, expenses: 2390 },
];

const lineChartData = [
    { day: 'Mon', users: 186, sessions: 305 },
    { day: 'Tue', users: 305, sessions: 420 },
    { day: 'Wed', users: 237, sessions: 350 },
    { day: 'Thu', users: 273, sessions: 390 },
    { day: 'Fri', users: 209, sessions: 320 },
    { day: 'Sat', users: 214, sessions: 280 },
    { day: 'Sun', users: 180, sessions: 250 },
];

const areaChartData = [
    { month: 'Jan', mobile: 80, desktop: 120 },
    { month: 'Feb', mobile: 200, desktop: 150 },
    { month: 'Mar', mobile: 120, desktop: 180 },
    { month: 'Apr', mobile: 190, desktop: 240 },
    { month: 'May', mobile: 130, desktop: 200 },
    { month: 'Jun', mobile: 220, desktop: 280 },
];

// Chart configs
const barChartConfig: ChartConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-1)',
    },
    expenses: {
        label: 'Expenses',
        color: 'var(--chart-2)',
    },
};

const lineChartConfig: ChartConfig = {
    users: {
        label: 'Users',
        color: 'var(--chart-3)',
    },
    sessions: {
        label: 'Sessions',
        color: 'var(--chart-4)',
    },
};

const areaChartConfig: ChartConfig = {
    mobile: {
        label: 'Mobile',
        color: 'var(--chart-5)',
    },
    desktop: {
        label: 'Desktop',
        color: 'var(--chart-1)',
    },
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'UI Demo',
        href: '/ui-demo',
    },
];

export default function UiDemo() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadingDemo = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="UI Components Demo" />

            <div className="flex h-full flex-1 flex-col gap-8 p-6">
                {/* Page Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">UI Components</h1>
                    <p className="text-muted-foreground">
                        Premium component showcase with Bold & Modern styling
                    </p>
                </div>

                {/* Typography Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Typography</h2>
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <p className="text-5xl font-bold tracking-tighter">Display Text</p>
                                <p className="text-xs text-muted-foreground font-mono">text-5xl font-bold tracking-tighter</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h1>Heading 1 - Page Title</h1>
                                <p className="text-xs text-muted-foreground font-mono">h1 - text-[2.25rem] font-bold tracking-tight</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h2>Heading 2 - Section Title</h2>
                                <p className="text-xs text-muted-foreground font-mono">h2 - text-[1.5rem] font-semibold tracking-tight</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h3>Heading 3 - Subsection</h3>
                                <p className="text-xs text-muted-foreground font-mono">h3 - text-[1.25rem] font-semibold tracking-tight</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h4>Heading 4 - Card Title</h4>
                                <p className="text-xs text-muted-foreground font-mono">h4 - text-[1.125rem] font-medium</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <p>Body text with good readability and line height for comfortable reading.</p>
                                <p className="text-xs text-muted-foreground font-mono">p - text-base leading-[1.6]</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Muted secondary text for descriptions and hints.</p>
                                <p className="text-xs text-muted-foreground font-mono">text-sm text-muted-foreground</p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <p className="font-mono text-sm">Monospace text for code: const premium = true;</p>
                                <p className="text-xs text-muted-foreground font-mono">font-mono (JetBrains Mono)</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Buttons Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Buttons</h2>
                    <p className="text-sm text-muted-foreground">
                        Hover for lift effect, click/hold for press feedback
                    </p>

                    <Card>
                        <CardHeader>
                            <CardTitle>Button Variants</CardTitle>
                            <CardDescription>Different styles for different contexts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Variants */}
                            <div className="flex flex-wrap gap-4">
                                <Button>Default</Button>
                                <Button variant="destructive">Destructive</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="link">Link</Button>
                            </div>

                            <Separator />

                            {/* Sizes */}
                            <div>
                                <p className="text-sm font-medium mb-3">Sizes</p>
                                <div className="flex flex-wrap items-center gap-4">
                                    <Button size="sm">Small</Button>
                                    <Button size="default">Default</Button>
                                    <Button size="lg">Large</Button>
                                    <Button size="icon"><Plus /></Button>
                                    <Button size="icon-sm"><Plus /></Button>
                                    <Button size="icon-lg"><Plus /></Button>
                                </div>
                            </div>

                            <Separator />

                            {/* With Icons */}
                            <div>
                                <p className="text-sm font-medium mb-3">With Icons</p>
                                <div className="flex flex-wrap gap-4">
                                    <Button><Mail /> Send Email</Button>
                                    <Button variant="outline"><Download /> Download</Button>
                                    <Button variant="secondary">Next <ArrowRight /></Button>
                                    <Button variant="destructive"><Trash2 /> Delete</Button>
                                </div>
                            </div>

                            <Separator />

                            {/* States */}
                            <div>
                                <p className="text-sm font-medium mb-3">States</p>
                                <div className="flex flex-wrap gap-4">
                                    <Button disabled>Disabled</Button>
                                    <Button onClick={handleLoadingDemo} disabled={isLoading}>
                                        {isLoading && <Loader2 className="animate-spin" />}
                                        {isLoading ? 'Loading...' : 'Click for Loading'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Cards Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Cards</h2>
                    <p className="text-sm text-muted-foreground">
                        Layered shadows with ring overlay for depth
                    </p>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Default Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Default Card</CardTitle>
                                <CardDescription>Standard card with subtle shadow</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    This card has layered shadows and a faint ring overlay for that premium Linear/Vercel feel.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" size="sm">Learn More</Button>
                            </CardFooter>
                        </Card>

                        {/* Interactive Card */}
                        <Card interactive>
                            <CardHeader>
                                <CardTitle>Interactive Card</CardTitle>
                                <CardDescription>Hover to see the lift effect</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    This card lifts on hover with enhanced shadow. Perfect for clickable items.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm">Select <ChevronRight /></Button>
                            </CardFooter>
                        </Card>

                        {/* Card with Action */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Card with Action</CardTitle>
                                <CardDescription>Action button in header</CardDescription>
                                <CardAction>
                                    <Button variant="ghost" size="icon-sm">
                                        <Settings />
                                    </Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cards can have action buttons positioned in the header area.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Inputs Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Inputs</h2>
                    <p className="text-sm text-muted-foreground">
                        Rounded corners, enhanced focus glow, hover states
                    </p>

                    <Card>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="default">Default Input</Label>
                                    <Input id="default" placeholder="Type something..." />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="search">With Icon (Search)</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input id="search" placeholder="Search..." className="pl-10" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="error">Error State</Label>
                                    <Input id="error" placeholder="Invalid input" aria-invalid="true" />
                                    <p className="text-sm text-destructive">This field has an error</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="disabled">Disabled</Label>
                                    <Input id="disabled" placeholder="Cannot edit" disabled />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Badges Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Badges</h2>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-3">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Skeleton Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Skeleton Loading</h2>
                    <p className="text-sm text-muted-foreground">
                        Shimmer effect (default) vs pulse animation
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Shimmer (Default)</CardTitle>
                                <CardDescription>Premium shimmer animation</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-20 w-full" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 w-20" />
                                    <Skeleton className="h-9 w-20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Pulse (Classic)</CardTitle>
                                <CardDescription>Traditional pulse animation</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton variant="default" className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton variant="default" className="h-4 w-32" />
                                        <Skeleton variant="default" className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton variant="default" className="h-20 w-full" />
                                <div className="flex gap-2">
                                    <Skeleton variant="default" className="h-9 w-20" />
                                    <Skeleton variant="default" className="h-9 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Dialog Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Dialog</h2>
                    <p className="text-sm text-muted-foreground">
                        Backdrop blur, smooth animations, elevation shadow
                    </p>

                    <Card>
                        <CardContent className="pt-6">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>Open Dialog</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Premium Dialog</DialogTitle>
                                        <DialogDescription>
                                            Notice the backdrop blur, smooth zoom animation, and elevated shadow styling.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <p className="text-sm text-muted-foreground">
                                            This dialog demonstrates the premium UI enhancements:
                                        </p>
                                        <ul className="mt-2 space-y-1 text-sm">
                                            <li className="flex items-center gap-2">
                                                <Check className="size-4 text-green-600" />
                                                Backdrop blur effect
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="size-4 text-green-600" />
                                                Smooth zoom + slide animation
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="size-4 text-green-600" />
                                                Layered shadow (elevation-4)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="size-4 text-green-600" />
                                                Subtle ring overlay
                                            </li>
                                        </ul>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline">Cancel</Button>
                                        <Button>Confirm</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </section>

                {/* Charts Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Charts</h2>
                    <p className="text-sm text-muted-foreground">
                        Recharts integration with premium color palette (chart-1 through chart-5)
                    </p>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Bar Chart</CardTitle>
                                <CardDescription>Monthly revenue vs expenses</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={barChartConfig} className="h-64 w-full">
                                    <BarChart data={barChartData} accessibilityLayer>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Bar
                                            dataKey="revenue"
                                            fill="var(--color-revenue)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="expenses"
                                            fill="var(--color-expenses)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Line Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Line Chart</CardTitle>
                                <CardDescription>Weekly users & sessions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={lineChartConfig} className="h-64 w-full">
                                    <LineChart data={lineChartData} accessibilityLayer>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Line
                                            type="monotone"
                                            dataKey="users"
                                            stroke="var(--color-users)"
                                            strokeWidth={2}
                                            dot={{ fill: 'var(--color-users)', strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="sessions"
                                            stroke="var(--color-sessions)"
                                            strokeWidth={2}
                                            dot={{ fill: 'var(--color-sessions)', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Area Chart - Full Width */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Area Chart</CardTitle>
                                <CardDescription>Mobile vs desktop traffic over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={areaChartConfig} className="h-72 w-full">
                                    <AreaChart data={areaChartData} accessibilityLayer>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Area
                                            type="monotone"
                                            dataKey="desktop"
                                            stackId="1"
                                            stroke="var(--color-desktop)"
                                            fill="var(--color-desktop)"
                                            fillOpacity={0.4}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="mobile"
                                            stackId="1"
                                            stroke="var(--color-mobile)"
                                            fill="var(--color-mobile)"
                                            fillOpacity={0.4}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Background Patterns Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Background Patterns</h2>
                    <p className="text-sm text-muted-foreground">
                        Subtle patterns for auth pages and hero sections
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Grid Pattern</CardTitle>
                                <CardDescription>bg-grid utility class</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative h-40 rounded-lg border overflow-hidden">
                                    <div className="absolute inset-0 bg-grid" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="bg-background px-3 py-1 rounded text-sm font-medium">Content</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Dots Pattern</CardTitle>
                                <CardDescription>bg-dots utility class</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative h-40 rounded-lg border overflow-hidden">
                                    <div className="absolute inset-0 bg-dots" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="bg-background px-3 py-1 rounded text-sm font-medium">Content</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Shadow Elevation Section */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Shadow Elevation</h2>
                    <p className="text-sm text-muted-foreground">
                        Layered shadow system for depth hierarchy
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((level) => (
                            <div
                                key={level}
                                className={`shadow-elevation-${level} rounded-xl border bg-card p-6 text-center`}
                            >
                                <p className="text-lg font-semibold">Level {level}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                    shadow-elevation-{level}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Interactive Demo */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight">Interactive Cards</h2>
                    <p className="text-sm text-muted-foreground">
                        Hover over these cards to see the lift effect
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            { icon: Zap, title: 'Fast', desc: 'Lightning quick responses' },
                            { icon: Heart, title: 'Loved', desc: 'Trusted by thousands' },
                            { icon: Bell, title: 'Smart', desc: 'Intelligent notifications' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <Card key={title} interactive>
                                <CardContent className="pt-6 text-center">
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
