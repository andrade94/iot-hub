# X4 Editorial Cool — Design System

Design system for the Astrea IoT Platform. Established March 2026.

## Typography

| Role | Font | Usage |
|------|------|-------|
| **Display** | Bricolage Grotesque (400-800) | Page titles, KPI numbers, org names |
| **Body** | Lexend (300-700) | Body text, labels, form fields, nav items |
| **Mono** | Fira Code (400-700) | Slugs, timestamps, data values, section dividers |

### Font Loading

```html
<link href="https://fonts.bunny.net/css?family=bricolage-grotesque:400,500,600,700,800&family=lexend:300,400,500,600,700&family=fira-code:400,500,700" rel="stylesheet" />
```

### CSS Variables

```css
--font-sans: 'Lexend', sans-serif;      /* body, labels (font-sans) */
--font-display: 'Bricolage Grotesque';   /* headings (font-display) */
--font-label: 'Lexend', sans-serif;      /* form labels, table headers (font-label) */
--font-mono: 'Fira Code', monospace;     /* data, timestamps (font-mono) */
```

### Type Scale

| Element | Classes |
|---------|---------|
| Page title | `font-display text-[28px] font-bold tracking-tight` |
| Section label (divider) | `font-mono text-[10px] font-medium tracking-[0.15em] uppercase` |
| Table header | `font-mono text-[9px] font-medium tracking-[0.12em] uppercase` |
| Body text | `text-[13px]` (default from table cells) |
| Small label | `text-[11px]` |
| Micro label | `text-[10px]` or `text-[9px]` |
| KPI number | `font-display text-4xl font-bold tabular-nums` |

---

## Color Palette

### Dark Mode (`#0b0d10` base)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0b0d10` | Page background |
| `--card` | `#111318` | Cards, panels |
| `--popover` | `#161a20` | Dropdowns, popovers |
| `--accent` | `#1e2228` | Hover states, subtle fills |
| `--border` | `#1e2228` | Borders (same as accent) |
| `--foreground` | `#e0e4ea` | Primary text |
| `--muted-foreground` | `#6b7280` | Secondary text |
| `--primary` | `#06b6d4` | Cyan accent (buttons, links, focus rings) |

### Light Mode (`#f8f9fb` base)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#f8f9fb` | Page background |
| `--card` | `#ffffff` | Cards, panels |
| `--popover` | `#ffffff` | Dropdowns, popovers |
| `--accent` | `#e8ecf1` | Hover states, subtle fills |
| `--border` | `#dfe3ea` | Borders |
| `--foreground` | `#0f1218` | Primary text |
| `--muted-foreground` | `#6b7280` | Secondary text |
| `--primary` | `#0891b2` | Cyan accent |

### Semantic Colors (PALETTE constant)

Used in charts, status indicators, and badges. Always use these — never ad-hoc hex values.

```typescript
const PALETTE = {
    emerald: { hex: '#10b981', light: '#059669', dark: '#34d399' },
    cyan:    { hex: '#06b6d4', light: '#0891b2', dark: '#22d3ee' },
    rose:    { hex: '#f43f5e', light: '#e11d48', dark: '#fb7185' },
    amber:   { hex: '#f59e0b', light: '#d97706', dark: '#fbbf24' },
    slate:   { hex: '#64748b', light: '#475569', dark: '#94a3b8' },
    offline: { hex: '#fda4af', light: '#fda4af', dark: '#9f1239' },
};
```

### Colored Text Pattern

Always use `dark:` variants for colored text so it works in both modes:

```
text-emerald-600 dark:text-emerald-400   ← for success/online/active
text-amber-600 dark:text-amber-400       ← for warnings/work orders
text-rose-600 dark:text-rose-400         ← for errors/alerts/offline
text-cyan-600 dark:text-cyan-400         ← for info/onboarding
```

Never use `-400` alone (too bright on light bg). Never use `-600` alone (too dark on dark bg).

### Status Mapping

| Status | Badge Variant | Color | Dot Class |
|--------|--------------|-------|-----------|
| Active | `success` | Emerald | `bg-emerald-400` |
| Onboarding | `warning` | Cyan | `bg-cyan-400` |
| Suspended | `destructive` | Rose | `bg-rose-400` |
| Draft | `outline` | Slate | `bg-muted-foreground/30` |
| Archived | `secondary` | Slate | `bg-muted-foreground/30` |

---

## Component Patterns

### Buttons — Visual Hierarchy

Three tiers of button prominence:

| Tier | Style | Usage | Example |
|------|-------|-------|---------|
| **Primary** | `bg-accent hover:bg-accent/80 dark:bg-accent dark:hover:bg-accent/60` + outline | Frequent actions | Edit, Manage |
| **Neutral** | `variant="outline"` | Standard actions | Add Site, Invite Member |
| **Dangerous** | `variant="outline"` + colored text + `border-border hover:border-{color}` | Destructive/rare | Suspend, Archive |

Dangerous buttons use default `border-border` at rest, colored border only on hover:
```tsx
className="text-rose-600 dark:text-rose-400 border-border hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30"
```

### Cards

```tsx
// Standard card (no padding by default — CardContent handles it)
<Card className="border-border shadow-none">
  <CardContent>...</CardContent>
</Card>

// Table wrapper (adds alternating row styles)
<Card className="editorial-table border-border shadow-none">
  <DataTable ... />
</Card>
```

Card specs: `rounded-[10px]`, `border-border`, no shadow, `py-0` (content manages padding). `CardContent` provides `px-5 py-5`.

### Tables

Table headers: `font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70 bg-accent/30`

Table cells: `text-[13px] text-secondary-foreground px-4 py-3.5`

Row hover: `hover:bg-[rgba(6,182,212,0.03)]` (subtle cyan tint)

Editorial alternating rows (`.editorial-table`):
- Dark: `nth-child(even) rgba(22, 26, 32, 0.5)`
- Light: `nth-child(even) rgba(240, 242, 245, 0.5)`

### Summary Strip (KPIs)

Large editorial numbers in a horizontal strip separated by vertical rules:

```tsx
<div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
    <SummaryStat label="Sites" value={12} />
    <SummaryStat label="Devices" value={87} />
    <SummaryStat label="Online" value={83} suffix="%" color="text-emerald-600 dark:text-emerald-400" />
</div>
```

Numbers: `font-display text-4xl font-bold`. Labels: `text-[9px] uppercase tracking-[0.14em]`. Clickable stats get `hover:bg-accent/20`.

### Section Dividers

Centered mono labels between horizontal rules:

```tsx
<div className="my-6 flex items-center gap-4">
    <div className="h-px flex-1 bg-border/50" />
    <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/30">
        BREAKDOWN
    </span>
    <div className="h-px flex-1 bg-border/50" />
</div>
```

### Tabs (Custom)

Not using shadcn Tabs. Custom buttons with bottom border:

```tsx
<button className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5
    text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors
    ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground/70'}`}>
    Sites
    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums bg-accent text-foreground">12</span>
</button>
```

Alert count badges use `bg-rose-500/15 text-rose-600 dark:text-rose-400`.

### Collapsible Filter Drawer

Search bar + "Filters" button always visible. Filter panel slides down via `max-h` transition:

```tsx
<div className={`overflow-hidden transition-all duration-200
    ${showFilters ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
```

Filter button shows active count badge: `bg-primary/20 text-primary`.

### Feed Rows (Alerts, Work Orders, Activity)

Standardized across all tab content:

| Property | Value |
|----------|-------|
| Title | `text-[13px] font-medium text-foreground` |
| Meta/subtitle | `font-mono text-[10px] text-muted-foreground` |
| Padding | `px-5 py-3.5` |
| Alignment | `items-center gap-3` |
| Status dot | `h-2 w-2 rounded-full` |
| Timestamp | `font-mono text-[10px] tabular-nums text-muted-foreground` |
| Hover | `hover:bg-accent/20` |
| Dividers | `divide-y divide-border/30` |

### Detail Inline (Key-Value)

Compact horizontal key-value pairs in a bar:

```tsx
<div className="flex items-center gap-2">
    <span className="text-[10px] text-muted-foreground/40">Timezone</span>
    <span className="font-mono text-[11px] text-foreground/80">America/Monterrey</span>
</div>
```

---

## Charts

### Theme-Aware Setup

```typescript
const isDark = document.documentElement.classList.contains('dark');
const chartTooltipStyle = {
    borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-body)',
    border: isDark ? 'none' : '1px solid #dfe3ea',
    backgroundColor: isDark ? 'rgba(17,19,24,0.95)' : '#ffffff',
    color: isDark ? '#e0e4ea' : '#0f1218',
    boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
};
const chartGridStroke = isDark ? 'rgba(30,34,40,0.6)' : 'rgba(0,0,0,0.06)';
const chartAxisFill = isDark ? '#6b7280' : '#9ca3af';
const chartCursorFill = isDark ? 'rgba(6,182,212,0.08)' : 'rgba(8,145,178,0.06)';
```

### Chart Colors

- Online/healthy: `PALETTE.emerald.hex` (`#10b981`)
- Offline/unhealthy: `isDark ? PALETTE.offline.dark : PALETTE.offline.light`
- Primary bars: `#06b6d4` (cyan)
- Secondary bars: `#94a3b8` (slate)

### Fleet Health Bar (CSS, not recharts)

```tsx
<div className="flex h-3 overflow-hidden rounded-full bg-accent">
    <div className="rounded-l-full bg-emerald-500" style={{ width: `${healthPct}%` }} />
    <div className="bg-rose-300 dark:bg-rose-900" style={{ width: `${100 - healthPct}%` }} />
</div>
```

### Sites by Status (CSS bars)

```tsx
<div className="flex h-2 flex-1 overflow-hidden rounded-full bg-accent">
    <div className="rounded-full" style={{ width: `${pct}%`, backgroundColor: statusColor }} />
</div>
```

---

## Custom Components

### TimezoneSelect (`@/components/ui/timezone-select`)

Searchable dropdown for timezone selection. Wraps `SearchableSelect` with formatted labels showing UTC offset. Backend provides `timezone_identifiers_list(\DateTimeZone::AMERICA)`.

### TimeInput (`@/components/ui/time-input`)

Two-field HH:MM input with:
- Chevron up/down buttons per field
- Arrow key support (up/down to adjust, left/right to move between fields)
- Mouse wheel scroll to adjust
- Clock icon prefix
- `value`/`onChange` compatible with Inertia `useForm`

---

## Sidebar Navigation

Compact sizing for Lexend font (wider than DM Sans):

| Element | Size |
|---------|------|
| Menu item height | `h-7` |
| Menu item text | `text-[13px]` |
| Menu gap | `gap-0.5` |
| Sub-menu text | `text-[13px]` |
| Large button | `h-10` |

---

## Page Layout Patterns

### Index Page (List View)

```
Title + Button
Summary Strip (KPIs)
──── SECTION DIVIDER ────
Search + Filter Drawer
Table (editorial alternating rows)
```

### Show Page (Detail View)

```
← Back link
Title + Slug + Badges          [Suspend] [Archive] [Manage] [Edit]
Summary Strip (clickable KPIs)
Details Bar (inline key-value pairs)
⚠ Smart Status Row (conditional)
──── BREAKDOWN ────
Charts (2 cards)
──── DATA ────
Tabs (Sites | Users | Alerts | Work Orders | Activity | Notes)
Tab Content (with contextual action buttons)
```

### Manage Dropdown Structure

```
⚙ Manage ▾
├── MONITORING
│   ├── Escalation Chains
│   └── Alert Analytics
├── OPERATIONS
│   ├── Maintenance Windows
│   ├── Report Schedules
│   └── Compliance Calendar
├── SETUP
│   └── Site Templates
└── ADVANCED
    ├── API Keys
    ├── Integrations
    └── Export All Data
```

---

## UX Patterns

### Add Site Flow

3-field modal → redirects to site onboarding wizard:
1. Name (required)
2. Address (optional)
3. Timezone (TimezoneSelect)
→ Creates as `draft`, redirects to `/sites/{id}/onboard`

### Invite Member Flow (2-step)

Step 1: Name, Email, Password, Role (radio cards with descriptions)
Step 2: Site access (checkboxes), Mobile app access (toggle)
→ Posts to `/settings/users`

### Filter Pattern

- Always visible: Search input + "Filters" button with badge count
- Collapsible: filter drawer with grouped options (Status, Segment)
- State persisted in localStorage
- "Clear" button + result count when filters active
