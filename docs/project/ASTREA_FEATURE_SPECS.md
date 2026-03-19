# Astrea IoT Platform — M6 Feature Specs

> Generated: 2026-03-19 | Phase 7 Playbook Output
> Source: ASTREA_TASK_BREAKDOWN.md, IMPLEMENTATION_GAP_REPORT.md
> Milestone: M6 — Production Readiness (34 gaps → 0)

---

## Feature Spec 1: Backend Scheduling & Invoice Lifecycle

**Business Context:** Three scheduled commands exist but are not registered in the scheduler, blocking billing (BR-024), compliance reminders (BR-038), and metering sync. Additionally, the invoice state machine (SM-003) has no automated `sent → overdue` transition, leaving stale invoices in `sent` status indefinitely.

**Gap Classification:** PARTIAL — commands exist and work when run manually; they are simply not scheduled.

**Current State:**
- `billing:generate-invoices` — command works, not scheduled
- `compliance:send-reminders` — command works, not scheduled
- `billing:sync-metering` — command works, not scheduled
- Invoice overdue — no command exists at all (MISSING)

### User Stories

- As an **org_admin**, I want invoices to be auto-generated monthly so I don't manually run the command.
- As an **org_admin**, I want compliance reminders sent automatically at 30/7/1 day intervals so I don't miss audit deadlines.
- As an **org_admin**, I want overdue invoices flagged automatically so I can follow up on payment.

### Business Rules

| ID | Rule | Enforcement |
|---|---|---|
| BR-024 | Invoice generated per org per period, unique | `GenerateInvoicesCommand` → schedule monthly |
| BR-027 | Invoice status: draft → sent → paid/overdue | `BillingController` + new `MarkOverdueInvoicesCommand` |
| BR-038 | Compliance reminders at 30/7/1 days | `SendComplianceRemindersCommand` → schedule daily |

### Data Model Changes

**New command:** `app/Console/Commands/MarkOverdueInvoicesCommand.php`
- No migration needed — `Invoice.status` already supports 'overdue' value
- Query: `Invoice::where('status', 'sent')->where('due_date', '<', now()->startOfDay())`
- Update: `status = 'overdue'`, log activity

### API Endpoints

No new endpoints. All existing billing endpoints already handle `overdue` status.

### Edge Cases

1. **Invoice due_date = today** — should NOT be marked overdue (only strictly past due)
2. **Invoice already paid same day as due_date** — race condition between overdue job and manual payment. Payment takes precedence (check status before update).
3. **No organizations with billing profiles** — commands should run silently with no errors
4. **Compliance event with no due_date** — skip (guard in command)
5. **Multiple orgs, mixed timezones** — invoice generation uses UTC dates; compliance reminders use org timezone

### Build Order

```
1. Register 3 existing commands in bootstrap/app.php schedule     [30min]
2. Create MarkOverdueInvoicesCommand                              [1h]
3. Register new command in schedule                                [5min]
4. Fix CommandCenter overdue count query                          [15min]
5. Write tests for new command + schedule verification            [45min]
```

### Acceptance Criteria

- [ ] `php artisan schedule:list` shows all 4 commands
- [ ] `billing:generate-invoices` runs monthly on 1st at 06:00
- [ ] `compliance:send-reminders` runs daily at 07:00
- [ ] `billing:sync-metering` runs daily at 01:00
- [ ] `billing:mark-overdue` runs daily at 00:30
- [ ] Invoices past due_date transition to `overdue` automatically
- [ ] Overdue invoices can still be marked as `paid`
- [ ] CommandCenter shows correct overdue invoice count
- [ ] Manual runs of all commands succeed with no errors on empty data

---

## Feature Spec 2: Frontend Role-Based UI Visibility

**Business Context:** `Can`, `HasRole`, `usePermission()`, and `useRole()` components/hooks exist but are used in zero page components. All 56 pages show all UI elements to all roles, relying solely on backend 403 responses. Users encounter confusing "forbidden" errors when clicking buttons they shouldn't see.

**Gap Classification:** MISSING — components exist in the library but are not wired into any page.

**Current State:**
- `@/components/Can.tsx` — renders children only if user has specified permission(s)
- `@/components/HasRole.tsx` — renders children only if user has specified role(s)
- `@/hooks/use-permission.ts` — `can()`, `cannot()` functions
- `@/hooks/use-role.ts` — `hasRole()`, `lacksRole()`, `isAdmin()`, `isSuperAdmin()`
- Shared Inertia data: `auth.permissions: string[]` and `auth.roles: string[]` on every page load
- Zero pages import or use these

### User Stories

- As a **site_viewer**, I want to see only the actions I can perform so I'm not confused by buttons that return errors.
- As a **technician**, I want to see "Start Work" and "Complete" on work orders assigned to me, but not "Delete" or "Cancel" which I can't do.
- As an **org_admin**, I want to see all management actions in Settings.

### Permission Mapping (from PM-001)

| Page | Action/Button | Permission Required | Roles That See It |
|---|---|---|---|
| Alerts Index/Show | Acknowledge | `acknowledge alerts` | super_admin, org_admin, site_manager, technician |
| Alerts Index/Show | Resolve | `acknowledge alerts` | super_admin, org_admin, site_manager, technician |
| Alerts Index/Show | Dismiss | `manage alert rules` | super_admin, org_admin, site_manager |
| Work Orders Index | "New Work Order" | `manage work orders` | super_admin, org_admin, site_manager |
| Work Order Detail | Start/Complete | `complete work orders` | super_admin, org_admin, technician |
| Work Order Detail | Cancel/Delete | `manage work orders` | super_admin, org_admin, site_manager |
| Dashboard | Command Center link | role = `super_admin` | super_admin only |
| Settings: Sites | Create/Edit/Delete | `manage sites` | super_admin, org_admin, site_manager |
| Settings: Devices | Create/Edit/Delete | `manage devices` | super_admin, org_admin, site_manager |
| Settings: Devices | Provision | `provision devices` | super_admin, org_admin |
| Settings: Rules | Create/Edit/Delete | `manage alert rules` | super_admin, org_admin, site_manager |
| Settings: Escalation | Create/Edit/Delete | `manage alert rules` | super_admin, org_admin, site_manager |
| Settings: Users | Create/Edit/Deactivate | `manage users` | super_admin, org_admin |
| Settings: Billing | Generate/Mark Paid | `manage org settings` | super_admin, org_admin |
| Settings: Compliance | Create/Complete/Delete | `manage org settings` | super_admin, org_admin |
| Settings: API Keys | Create/Delete | `manage org settings` | super_admin, org_admin |
| Settings: Integrations | Configure | `manage org settings` | super_admin, org_admin |
| Settings: Recipes | Edit | `manage devices` | super_admin, org_admin, site_manager |

### Implementation Pattern

```tsx
// Permission-based (most cases):
import Can from '@/components/Can';

<Can permission="manage work orders">
  <Button onClick={handleCreate}>New Work Order</Button>
</Can>

// Role-based (Command Center link):
import HasRole from '@/components/HasRole';

<HasRole role="super_admin">
  <Link href="/command-center">Command Center</Link>
</HasRole>

// Multiple permissions (require all):
<Can permission={['manage devices', 'provision devices']} requireAll>
  <Button>Provision Device</Button>
</Can>
```

### Build Order

```
1. Alerts pages (index + show) — wrap 3 buttons                  [1h]
2. Work Orders pages (index + show) — wrap 4 buttons             [1h]
3. Dashboard — Command Center link                                [15min]
4. Settings pages — iterate through all 11 settings pages         [2h]
5. Manual verification: login as each role, verify visibility     [1h]
```

### Edge Cases

1. **User with custom permission set** (not standard role) — `Can` checks permissions not roles, so custom combos work
2. **super_admin sees everything** — super_admin has all permissions, so all buttons always visible
3. **Button inside dropdown menu** — wrap the DropdownMenuItem, not the DropdownMenu
4. **Empty action column** — if all buttons are hidden for a role, the action column should collapse or show "—"
5. **Inertia page load caching** — permissions are shared on every Inertia request (5min cache), so role changes take up to 5min to reflect

### QA Test Plan

**Staging:** `http://iot-hub.test`

| Role | Email | Password |
|---|---|---|
| super_admin | super@astrea.io | password |
| org_admin | admin@cadenademo.com | password |
| site_manager | manager@cadenademo.com | password |
| site_viewer | viewer@cadenademo.com | password |
| technician | tech@cadenademo.com | password |

**Test Scenarios:**

1. **site_viewer on Alerts Index** — should see alert table but NO Acknowledge/Resolve/Dismiss buttons. Verify no 403 errors possible.
2. **technician on Work Orders** — should see "Start Work" and "Complete" on assigned WOs. Should NOT see "New", "Cancel", "Delete".
3. **site_manager on Settings: Users** — should NOT see Create/Edit/Deactivate buttons (only org_admin+ can manage users).
4. **org_admin on Dashboard** — should NOT see Command Center link.
5. **super_admin full access** — should see all buttons on all pages.
6. **technician on Settings pages** — should have no access to most settings. Verify navigation doesn't show unauthorized settings links.

### UX Review Checklist

- [ ] Buttons that were hidden don't leave empty/broken layout
- [ ] Action columns in tables collapse gracefully when no actions available
- [ ] No flash of unauthorized buttons during page load
- [ ] Dropdown menus with all items hidden don't render empty dropdown
- [ ] "Read-only" experience for low-permission roles still feels complete (not broken)

---

## Feature Spec 3: Empty States + Loading Skeletons

**Business Context:** Only 3 of 56 pages implement empty states and 1 uses skeleton loading. Users landing on pages with no data see empty tables with no guidance. Pages have no loading indicators during Inertia transitions.

**Gap Classification:** MISSING — `EmptyState` and `Skeleton` components exist in `@/components/ui/` but are largely unused.

**Current State:**
- `@/components/ui/empty-state.tsx` — accepts `icon`, `title`, `description`, `action` (button)
- `@/components/ui/skeleton.tsx` — accepts `className`, supports `shimmer`/`pulse` variants
- 3 pages use EmptyState: activity-log (local), settings/sites/onboard, settings/rules
- 1 page uses Skeleton: activity-log

### Implementation Pattern — Empty States

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle } from 'lucide-react';

// In render, when data.length === 0:
{alerts.data.length === 0 ? (
  <EmptyState
    icon={AlertTriangle}
    title={t('No alerts')}
    description={t('All systems operating normally')}
  />
) : (
  <AlertsTable alerts={alerts} />
)}
```

### Implementation Pattern — Skeletons

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// KPI card skeleton
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Table skeleton
function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Build Order

```
1. Create reusable skeleton patterns (TableSkeleton, CardGridSkeleton)  [1h]
2. Dashboard — empty state + skeleton                                    [45min]
3. Alerts Index — empty + filtered-empty + skeleton                      [45min]
4. Work Orders Index — empty + filtered-empty + skeleton                 [45min]
5. Site Detail — no-devices empty state + skeleton                       [30min]
6. Device Detail — skeleton                                              [30min]
7. Reports Index — skeleton                                              [30min]
8. Settings: Billing — no-subscription + no-invoices + skeleton          [45min]
9. Settings: Compliance — empty + skeleton                               [30min]
10. Settings: Users — skeleton                                           [30min]
11. Command Center — skeleton                                            [30min]
12. Settings: Sites — skeleton                                           [30min]
```

### Acceptance Criteria

- [ ] Every data page shows meaningful empty state when no data exists
- [ ] Empty states have role-appropriate CTAs (admin sees "Create", viewer sees "No data yet")
- [ ] All empty state text wrapped in `t()` for i18n
- [ ] Skeleton shows on initial page load before data arrives
- [ ] Skeleton layout matches actual content layout (no shift)
- [ ] Filtered-empty states offer "Clear filters" action

---

## Feature Spec 4: State Transition Guards

**Business Context:** Alert (SM-001) and Work Order (SM-002) status transitions are managed as string assignments in controllers with no model-level validation. Invalid transitions (e.g., `resolved → active`) are not prevented.

**Gap Classification:** PARTIAL — state values and transitions work correctly in normal flow, but no guard prevents invalid transitions.

### Implementation

**Pattern — add to each model:**

```php
// app/Models/Alert.php
protected static array $transitions = [
    'active' => ['acknowledged', 'resolved', 'dismissed'],
    'acknowledged' => ['resolved', 'dismissed'],
    // resolved, dismissed are terminal
];

public function canTransitionTo(string $newStatus): bool
{
    return in_array($newStatus, static::$transitions[$this->status] ?? []);
}

public function transitionTo(string $newStatus): void
{
    if (! $this->canTransitionTo($newStatus)) {
        throw new \InvalidArgumentException(
            "Cannot transition from '{$this->status}' to '{$newStatus}'"
        );
    }
    $this->update(['status' => $newStatus]);
}
```

**Apply to:**
- `Alert.php` — SM-001 (active → acknowledged → resolved/dismissed)
- `WorkOrder.php` — SM-002 (open → assigned → in_progress → completed/cancelled)

### Build Order

```
1. Add transition map + canTransitionTo() + transitionTo() to Alert      [1h]
2. Update AlertController to use transitionTo() instead of direct update  [30min]
3. Add same pattern to WorkOrder                                          [1h]
4. Update WorkOrderController                                             [30min]
5. Write tests for valid + invalid transitions                            [1h]
```

### QA Test Plan

**Test Scenarios:**

1. **Valid transition** — `active → acknowledged` via Acknowledge button → succeeds
2. **Valid terminal** — `acknowledged → resolved` → succeeds, alert is terminal
3. **Invalid reverse** — API call `POST /alerts/{id}/acknowledge` on `resolved` alert → 422 error
4. **Invalid skip** — attempt `open → completed` on work order → 422 error
5. **Concurrent access** — two users try to transition same alert simultaneously → first succeeds, second gets error
6. **API endpoints** — mobile API `POST /alerts/{id}/acknowledge` respects same guards

---

## Feature Spec 5: Client-Side Zod Validation (Priority Forms)

**Business Context:** All 10 entity validations (VL-001 through VL-010) rely on server-round-trip. Users must submit forms to see validation errors. The Billing Profile form (VL-008) is the highest priority — Mexican tax field formats (RFC, regimen fiscal, postal code) are complex and error-prone.

**Gap Classification:** MISSING — `form-rhf.tsx` component exists but is unused. No Zod schemas in any page.

### Migration Pattern

```tsx
// BEFORE: Inertia useForm (server-only validation)
const form = useForm({ rfc: '', razon_social: '' });
const submit = () => form.post('/settings/billing/profiles');

// AFTER: form-rhf with Zod (client + server validation)
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form-rhf';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from '@inertiajs/react';

const schema = z.object({
  rfc: z.string().min(12).max(13).regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/),
  razon_social: z.string().min(1).max(255),
});

const form = useForm({ resolver: zodResolver(schema) });
const onSubmit = (data) => router.post('/settings/billing/profiles', data);
```

### Priority Order

| Priority | Form | Rationale |
|---|---|---|
| 1 | Billing Profile (VL-008) | Mexican tax fields are complex; errors are costly |
| 2 | Escalation Chain (VL-009) | Complex JSON structure with nested validation |
| 3 | Alert Rule (VL-003) | JSON conditions need structure validation |
| 4 | User (VL-010) | Email format + role enum validation |
| 5 | Site (VL-001) | Timezone + lat/lng bounds |
| 6 | Device (VL-002) | dev_eui format + model enum |
| 7 | Work Order (VL-004) | Simple enum validation |
| 8 | Compliance Event (VL-007) | Simple enum + date validation |

### Build Order

```
1. Verify form-rhf + Zod + zodResolver are installed                      [15min]
2. Billing Profile form — full migration to form-rhf + Zod               [2h]
3. Escalation Chain form — nested JSON levels validation                  [2h]
4. Alert Rule form — JSON conditions + severity enum                      [1h]
5. User form — email + role enum                                          [1h]
6. Site form — timezone + lat/lng                                         [1h]
7. Device form — dev_eui + model enum                                     [1h]
8. Work Order form — enum types                                           [45min]
9. Compliance Event form — enum + date                                    [45min]
```

### Acceptance Criteria

- [ ] Client-side validation fires before form submission
- [ ] Error messages match server-side messages (consistency)
- [ ] Server-side validation still works as fallback
- [ ] form-rhf error display integrates with existing UI patterns
- [ ] All Zod schemas match corresponding VL-xxx spec exactly

---

## Global Build Checklist (M6 Implementation Order)

Following Phase 7d ordering — backend before frontend, each layer builds on the previous.

```
CYCLE 1 — Backend Critical (Day 1)
├── 1. Schedule 3 existing commands in bootstrap/app.php
├── 2. Create MarkOverdueInvoicesCommand
├── 3. Fix CommandCenter overdue count
├── 4. Tests: schedule verification + overdue transition
└── 5. Update SYSTEM_BEHAVIOR_SPEC with EXTRA items

CYCLE 2 — Frontend Permissions + UX States (Days 2-3)
├── 1. Alert pages: wrap 3 buttons with Can
├── 2. Work Order pages: wrap 4 buttons with Can
├── 3. Dashboard: HasRole for CC link
├── 4. Settings pages: wrap all CRUD buttons (11 pages)
├── 5. Create reusable skeleton components (TableSkeleton, CardGridSkeleton)
├── 6. Add EmptyState to 10 pages
├── 7. Add Skeleton to 10 pages
├── 8. Add state transition guards to Alert model
├── 9. Add state transition guards to WorkOrder model
└── 10. Tests: role visibility + state transitions

CYCLE 3 — Validation + Polish (Days 4-5)
├── 1. Verify form-rhf + Zod + zodResolver installed
├── 2. Billing Profile form → form-rhf + Zod
├── 3. Escalation Chain form → form-rhf + Zod
├── 4. Remaining 6 entity forms → Zod schemas
├── 5. Complete defrost suppression in RuleEvaluator
├── 6. Add compliance event overdue transition
└── 7. Tests: form validation + defrost suppression

CYCLE 4 — Sweeps + Launch (Day 6)
├── 1. i18n sweep: all new strings wrapped in t()
├── 2. Mobile responsive audit at 375px
├── 3. Navigation consistency check
├── 4. Regenerate IMPLEMENTATION_GAP_REPORT.md (Phase 8)
└── 5. Update ASTREA_ROADMAP.md with M6 status
```

---

*Each spec above is structured for Linear import. Copy the title, objective, acceptance criteria, and test scenarios directly into issues.*
