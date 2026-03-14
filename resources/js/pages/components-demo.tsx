import { Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    BarChart3,
    Bell,
    CheckCircle,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    FileText,
    Info,
    Mail,
    Package,
    Settings,
    Sparkles,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';

// Layout
import AppLayout from '@/layouts/app-layout';

// UI Components
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnnouncementBanner } from '@/components/ui/announcement-banner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup } from '@/components/ui/avatar-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircularProgress, Progress } from '@/components/ui/progress';
import { CodeBlock, InlineCode } from '@/components/ui/code-block';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingContainer } from '@/components/ui/loading-overlay';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SkipLink } from '@/components/ui/skip-link';
import { StatCard } from '@/components/ui/stat-card';
import { Stepper, type Step } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagsInput } from '@/components/ui/tags-input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Components Demo', href: '/components-demo' },
];

// Sample data
const teamMembers = [
    { src: 'https://i.pravatar.cc/150?img=1', fallback: 'JD', name: 'John Doe' },
    { src: 'https://i.pravatar.cc/150?img=2', fallback: 'AS', name: 'Alice Smith' },
    { src: 'https://i.pravatar.cc/150?img=3', fallback: 'BJ', name: 'Bob Johnson' },
    { src: 'https://i.pravatar.cc/150?img=4', fallback: 'CW', name: 'Carol White' },
    { src: 'https://i.pravatar.cc/150?img=5', fallback: 'DM', name: 'David Miller' },
    { src: 'https://i.pravatar.cc/150?img=6', fallback: 'EL', name: 'Eva Lee' },
    { src: 'https://i.pravatar.cc/150?img=7', fallback: 'FG', name: 'Frank Garcia' },
];

const steps: Step[] = [
    { id: 1, title: 'Account', description: 'Create your account' },
    { id: 2, title: 'Profile', description: 'Set up your profile' },
    { id: 3, title: 'Settings', description: 'Configure preferences' },
    { id: 4, title: 'Complete', description: 'Ready to go' },
];

const sampleCode = `import { Button } from '@/components/ui/button';

export function MyComponent() {
    return (
        <Button variant="default" loading>
            Save Changes
        </Button>
    );
}`;

export default function ComponentsDemo() {
    const [tags, setTags] = useState<string[]>(['React', 'TypeScript', 'Tailwind']);
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [buttonLoading, setButtonLoading] = useState(false);

    const simulateLoading = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    const simulateButtonLoading = () => {
        setButtonLoading(true);
        setTimeout(() => setButtonLoading(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Components Demo" />
            <SkipLink />

            <div className="space-y-12 pb-12">
                {/* Hero Section */}
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 md:p-12">
                    <div className="absolute inset-0 bg-grid opacity-50" />
                    <div className="relative z-10">
                        <Badge variant="outline" className="mb-4">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Premium UI Kit
                        </Badge>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                            Component Library
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                            A comprehensive collection of beautifully designed, accessible, and
                            production-ready components built with React, TypeScript, and Tailwind CSS.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button size="lg">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="lg">
                                Documentation
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Announcement Banner Demo */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Announcement Banners</h2>
                    <div className="space-y-3">
                        <AnnouncementBanner
                            variant="gradient"
                            message="New feature released! Check out the enhanced dashboard."
                            action={{ label: 'Learn More', onClick: () => {} }}
                        />
                        <AnnouncementBanner
                            variant="info"
                            message="System maintenance scheduled for this weekend."
                        />
                        <AnnouncementBanner
                            variant="warning"
                            message="Your subscription expires in 3 days."
                            action={{ label: 'Renew Now', onClick: () => {} }}
                        />
                    </div>
                </section>

                {/* Stats Section */}
                <section id="main-content">
                    <h2 className="mb-6 text-2xl font-semibold">Statistics Cards</h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Revenue"
                            value="$45,231.89"
                            icon={<DollarSign className="h-5 w-5" />}
                            trend={{ value: 20.1, label: 'from last month' }}
                            variant="elevated"
                        />
                        <StatCard
                            title="Subscriptions"
                            value="+2,350"
                            icon={<Users className="h-5 w-5" />}
                            trend={{ value: 180.1, label: 'from last month' }}
                            variant="elevated"
                        />
                        <StatCard
                            title="Sales"
                            value="+12,234"
                            icon={<CreditCard className="h-5 w-5" />}
                            trend={{ value: 19, label: 'from last month' }}
                            variant="elevated"
                        />
                        <StatCard
                            title="Active Now"
                            value="+573"
                            icon={<Activity className="h-5 w-5" />}
                            trend={{ value: -4.2, label: 'since last hour', isPositive: false }}
                            variant="elevated"
                        />
                    </div>
                </section>

                {/* Badges & Alerts */}
                <section className="grid gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Badge Variants</CardTitle>
                            <CardDescription>Status indicators for any context</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="success">Success</Badge>
                                <Badge variant="warning">Warning</Badge>
                                <Badge variant="info">Info</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                                <Badge variant="outline">Outline</Badge>
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline-success">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Completed
                                </Badge>
                                <Badge variant="outline-warning">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Pending
                                </Badge>
                                <Badge variant="outline-info">
                                    <Info className="mr-1 h-3 w-3" />
                                    Processing
                                </Badge>
                                <Badge variant="outline-destructive">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    Failed
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Alert Variants</CardTitle>
                            <CardDescription>Contextual feedback messages</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Alert variant="success">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>Your changes have been saved successfully.</AlertDescription>
                            </Alert>
                            <Alert variant="warning">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>Your session will expire in 5 minutes.</AlertDescription>
                            </Alert>
                            <Alert variant="info">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Info</AlertTitle>
                                <AlertDescription>A new version is available for download.</AlertDescription>
                            </Alert>
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>Something went wrong. Please try again.</AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </section>

                {/* Progress Indicators */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Progress Indicators</h2>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Linear Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Progress value={33} label="Upload Progress" showLabel size="lg" />
                                <Progress value={66} variant="success" showLabel />
                                <Progress value={50} variant="warning" showLabel />
                                <Progress value={80} variant="info" showLabel />
                                <Progress indeterminate label="Processing..." size="sm" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Circular Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap items-center justify-center gap-6">
                                    <CircularProgress value={25} size="sm" showLabel />
                                    <CircularProgress value={50} size="md" showLabel />
                                    <CircularProgress value={75} size="lg" showLabel variant="success" />
                                    <CircularProgress value={90} size="xl" showLabel variant="info" />
                                    <CircularProgress indeterminate size="md" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Avatars */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Avatars & Groups</h2>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Avatar Sizes & Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap items-end gap-4">
                                    <Avatar size="xs">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=1" />
                                        <AvatarFallback>XS</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="sm" status="online">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=2" />
                                        <AvatarFallback>SM</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="md" status="away">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=3" />
                                        <AvatarFallback>MD</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="lg" status="busy">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=4" />
                                        <AvatarFallback>LG</AvatarFallback>
                                    </Avatar>
                                    <Avatar size="xl" status="offline">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=5" />
                                        <AvatarFallback>XL</AvatarFallback>
                                    </Avatar>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Avatar Groups</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="mb-2 text-sm text-muted-foreground">Team Members</p>
                                    <AvatarGroup avatars={teamMembers} max={5} size="md" />
                                </div>
                                <div>
                                    <p className="mb-2 text-sm text-muted-foreground">Large Size</p>
                                    <AvatarGroup avatars={teamMembers} max={4} size="lg" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Stepper */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Multi-Step Wizard</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>Onboarding Flow</CardTitle>
                            <CardDescription>Guide users through complex processes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <Stepper steps={steps} currentStep={currentStep} orientation="horizontal" />
                            <div className="flex justify-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                    disabled={currentStep === 0}
                                >
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                                    disabled={currentStep === 3}
                                >
                                    Next Step
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Buttons & Inputs */}
                <section className="grid gap-8 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Button States</CardTitle>
                            <CardDescription>Loading states and variants</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button>Default</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="destructive">Destructive</Button>
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                                <Button loading={buttonLoading} onClick={simulateButtonLoading}>
                                    {buttonLoading ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button loading loadingText="Processing...">
                                    Submit
                                </Button>
                                <Button disabled>Disabled</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tags Input</CardTitle>
                            <CardDescription>Add multiple values easily</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Skills</Label>
                                <TagsInput
                                    value={tags}
                                    onChange={setTags}
                                    placeholder="Add a skill..."
                                    maxTags={10}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Press Enter or use comma to add tags
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Code Block & Copy Button */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Code Display</h2>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Code Block</CardTitle>
                                <CardDescription>Syntax highlighted code display</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CodeBlock
                                    code={sampleCode}
                                    language="tsx"
                                    filename="MyComponent.tsx"
                                    showLineNumbers
                                    highlightLines={[4, 5, 6]}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Copy to Clipboard</CardTitle>
                                <CardDescription>Quick copy functionality</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                                    <code className="flex-1 text-sm">npm install @shadcn/ui</code>
                                    <CopyButton value="npm install @shadcn/ui" />
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                                    <code className="flex-1 text-sm">sk_live_xxxxxxxxxxxxx</code>
                                    <CopyButton value="sk_live_xxxxxxxxxxxxx" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Using <InlineCode>CopyButton</InlineCode> component for one-click copying
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Loading States */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Loading States</h2>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Skeleton Loading</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[200px]" />
                                        <Skeleton className="h-4 w-[150px]" />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[80%]" />
                                    <Skeleton className="h-4 w-[60%]" />
                                </div>
                            </CardContent>
                        </Card>

                        <LoadingContainer loading={isLoading} text="Loading content...">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>Loading Overlay</CardTitle>
                                    <CardDescription>Click to see the loading state</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-4 text-muted-foreground">
                                        This card demonstrates the loading overlay component that
                                        covers content while data is being fetched.
                                    </p>
                                    <Button onClick={simulateLoading}>
                                        Simulate Loading
                                    </Button>
                                </CardContent>
                            </Card>
                        </LoadingContainer>
                    </div>
                </section>

                {/* Form Example */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Form Components</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Form</CardTitle>
                            <CardDescription>A polished form layout example</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Tell us about your project..."
                                        rows={4}
                                    />
                                </div>
                                <div className="flex items-center gap-2 sm:col-span-2">
                                    <Switch id="newsletter" />
                                    <Label htmlFor="newsletter" className="font-normal">
                                        Subscribe to newsletter
                                    </Label>
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="submit" className="w-full sm:w-auto">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Message
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </section>

                {/* Feature Cards */}
                <section>
                    <h2 className="mb-6 text-2xl font-semibold">Interactive Cards</h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Card interactive className="group">
                            <CardHeader>
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <CardTitle>Lightning Fast</CardTitle>
                                <CardDescription>
                                    Optimized for performance with minimal bundle size
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card interactive className="group">
                            <CardHeader>
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success transition-transform group-hover:scale-110">
                                    <Package className="h-5 w-5" />
                                </div>
                                <CardTitle>80+ Components</CardTitle>
                                <CardDescription>
                                    Comprehensive library of production-ready components
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card interactive className="group">
                            <CardHeader>
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info transition-transform group-hover:scale-110">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <CardTitle>Fully Customizable</CardTitle>
                                <CardDescription>
                                    Built with CSS variables for easy theming
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
