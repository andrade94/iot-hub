# Astrea IoT Platform — Task Breakdown

> Generated: 2026-03-19 | Phase 6 Playbook Output
> Primary Input: IMPLEMENTATION_GAP_REPORT.md (34 gaps: 6 backend, 28 frontend)
> Cross-references: SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md
> Milestones M1-M5: 100% complete | This plan covers M6 (Production Readiness)

---

## Roadmap Overview

```
Cycle 1: Critical Backend + Quick Wins        (P0)  ~1 day
Cycle 2: Frontend Role Visibility + UX States  (P1)  ~2 days
Cycle 3: Client-Side Validation + Polish       (P2)  ~2 days
Cycle 4: Cross-Cutting Sweeps + Launch Prep    (P3)  ~1 day
```

**Total estimated effort:** ~6 days (solo dev)

---

## Feature Area Mapping

| Feature Area | Screens | Workflows | Entities |
|---|---|---|---|
| **Core Monitoring** | Dashboard, Site Detail, Zone Detail, Device Detail | WF-002, WF-004 | Site, Device, Gateway, SensorReading |
| **Alert Management** | Alerts Index, Alert Detail, Rules, Escalation Chains | WF-003 | Alert, AlertRule, EscalationChain |
| **Work Orders** | WO Index, WO Detail | WF-005 | WorkOrder, WorkOrderNote, WorkOrderPhoto |
| **Billing & Finance** | Billing Dashboard, Profiles | WF-007 | Invoice, Subscription, BillingProfile |
| **Compliance** | Compliance Calendar | WF-008 | ComplianceEvent |
| **Onboarding** | Partner Portal, Site Onboarding, Site/Gateway/Device Settings | WF-001 | Organization, Site, Gateway, Device |
| **Reports** | Reports Index, Temperature, Energy, Summary | WF-006 | SensorReading (aggregated) |
| **Command Center** | CC Index, Alerts, Devices, WOs, Revenue, Dispatch, Org Detail | WF-001, WF-003-005, WF-007 | All (global scope) |
| **User Management** | Users Settings | WF-009 | User |
| **Settings** | Org, API Keys, Integrations, Recipes, Modules, Branding | WF-009-012 | Organization, ApiKey, IntegrationConfig, Recipe |

---

## Cycle 1: Critical Backend + Quick Wins

> **Focus:** Fix P0 gaps that block production workflows. Schedule missing commands, add invoice overdue transition.
> **Effort:** ~1 day

### Dev Tasks

| ID | Title | P | Est | Gap Refs | Blocked By |
|---|---|---|---|---|---|
| M6-001 | Schedule missing billing/compliance commands | P0 | 30min | BR-024, BR-038, SM-003 | — |
| M6-002 | Add invoice overdue scheduled job | P0 | 2h | SM-003, BR-027 | — |
| M6-003 | Verify CommandCenter overdue invoice count | P0 | 30min | Reverse scan finding | — |
| M6-004 | Update SYSTEM_BEHAVIOR_SPEC with EXTRA items | P1 | 1h | Reverse scan (10 items) | — |

---

#### M6-001: Schedule missing billing/compliance commands

**Objective:** Add 3 missing scheduled commands to `bootstrap/app.php` so billing and compliance workflows execute automatically.

**File:** `bootstrap/app.php` (inside `->withSchedule()` closure)

**Changes:**

```php
// Generate monthly invoices (1st of each month at 6:00 AM)
$schedule->command('billing:generate-invoices')->monthlyOn(1, '06:00');

// Send compliance reminders (daily at 7:00 AM)
$schedule->command('compliance:send-reminders')->dailyAt('07:00');

// Sync subscription metering (daily at 1:00 AM)
$schedule->command('billing:sync-metering')->dailyAt('01:00');
```

**Acceptance Criteria:**
- [ ] `php artisan schedule:list` shows all 3 new commands
- [ ] `billing:generate-invoices` runs on 1st of month
- [ ] `compliance:send-reminders` runs daily and sends at 30/7/1 day intervals (BR-038)
- [ ] `billing:sync-metering` runs daily

---

#### M6-002: Add invoice overdue scheduled job

**Objective:** Create a scheduled command that transitions invoices from `sent` → `overdue` when `due_date` has passed (SM-003).

**New file:** `app/Console/Commands/MarkOverdueInvoicesCommand.php`

**Logic:**
1. Query `Invoice::where('status', 'sent')->where('due_date', '<', today())`
2. Update each to `status = 'overdue'`
3. Log activity

**Schedule:** Add to `bootstrap/app.php`: `$schedule->command('billing:mark-overdue')->dailyAt('00:30');`

**Acceptance Criteria:**
- [ ] Invoices past due_date automatically transition to overdue
- [ ] Activity log records the transition
- [ ] SM-003 state machine is fully operational

---

#### M6-003: Verify CommandCenter overdue invoice count

**Objective:** Verify whether `CommandCenterController` line 202 counting `status='draft'` for overdue is intentional or a bug.

**File:** `app/Http/Controllers/CommandCenterController.php:202`

**Action:** If bug → fix to count `status='overdue'`. If intentional (no overdue status exists yet) → will be resolved once M6-002 ships.

**Acceptance Criteria:**
- [ ] `overdue_invoices` metric in Command Center reflects actual overdue invoices

---

#### M6-004: Update SYSTEM_BEHAVIOR_SPEC with EXTRA items

**Objective:** Add 10 undocumented code features to the spec so it's complete.

**Items to add:**
- `ApplyOrgBranding` middleware → WF-012 section
- `DoorPatternService` → new BR-xxx for cold_chain analytics
- `CompressorDutyCycleService` → new BR-xxx for industrial analytics
- `ExportReadyNotification` → new NT-xxx
- `FloorPlan` model + controller → WF-001 onboarding sub-step
- `TrafficSnapshot` model → retail segment analytics
- `IaqZoneScore` model → iaq segment analytics
- `reports/summary.tsx` → screen inventory
- `settings/modules.tsx` → screen inventory
- `settings/billing/profiles.tsx` → screen inventory

**Acceptance Criteria:**
- [ ] All EXTRA items from gap report either added to spec or documented as dev-only tools
- [ ] Reverse gap scan section shows 0 undocumented items

---

## Cycle 2: Frontend Role Visibility + UX States

> **Focus:** Add permission-based UI visibility and empty/loading states across all pages.
> **Effort:** ~2 days

### Dev Tasks

| ID | Title | P | Est | Gap Refs | Blocked By |
|---|---|---|---|---|---|
| M6-010 | Add `Can`/`HasRole` wrappers to Alert action buttons | P1 | 1h | PM-001, WF-003 | — |
| M6-011 | Add `Can`/`HasRole` wrappers to Work Order action buttons | P1 | 1h | PM-001, WF-005 | — |
| M6-012 | Add `Can`/`HasRole` wrappers to all Settings CRUD buttons | P1 | 2h | PM-001, WF-009-012 | — |
| M6-013 | Add `HasRole` to Dashboard Command Center link | P1 | 15min | PM-001, WF-001 | — |
| M6-014 | Add EmptyState to 10 key pages | P1 | 3h | Screen States gaps | — |
| M6-015 | Add Skeleton loading to 10 key pages | P1 | 4h | Screen States gaps | — |
| M6-016 | Add state transition guards to Alert model | P2 | 1.5h | SM-001 | — |
| M6-017 | Add state transition guards to WorkOrder model | P2 | 1.5h | SM-002 | — |

---

#### M6-010: Add `Can`/`HasRole` to Alert action buttons

**Objective:** Wrap Acknowledge, Resolve, and Dismiss buttons with permission checks so unauthorized users don't see them.

**File:** `resources/js/pages/alerts/index.tsx`, `resources/js/pages/alerts/show.tsx`

**Pattern:**
```tsx
import Can from '@/components/Can';

// Before:
<Button onClick={acknowledge}>Acknowledge</Button>

// After:
<Can permission="acknowledge alerts">
  <Button onClick={acknowledge}>Acknowledge</Button>
</Can>
```

**Buttons to wrap:**
- Acknowledge → `acknowledge alerts`
- Resolve → `acknowledge alerts`
- Dismiss → `manage alert rules`

**Acceptance Criteria:**
- [ ] site_viewer sees alerts but NO action buttons
- [ ] technician sees Acknowledge + Resolve but NOT Dismiss
- [ ] site_manager sees all action buttons
- [ ] No 403 errors encountered by any role

---

#### M6-011: Add `Can`/`HasRole` to Work Order action buttons

**File:** `resources/js/pages/work-orders/index.tsx`, `resources/js/pages/work-orders/show.tsx`

**Buttons to wrap:**
- "New Work Order" → `manage work orders`
- "Start Work" / "Complete" → `complete work orders`
- "Cancel" → `manage work orders`
- "Delete" → `manage work orders`

**Acceptance Criteria:**
- [ ] technician sees "Start Work" + "Complete" but NOT "New", "Cancel", "Delete"
- [ ] site_viewer cannot access work orders page (backend blocks)
- [ ] No 403 errors for any role

---

#### M6-012: Add `Can`/`HasRole` to all Settings CRUD buttons

**Files:** All `resources/js/pages/settings/**/*.tsx`

**Scope:**
| Page | Button | Permission |
|---|---|---|
| Sites | Create, Edit, Delete | `manage sites` |
| Devices | Create, Edit, Delete, Provision | `manage devices` / `provision devices` |
| Gateways | Create, Delete | `manage devices` |
| Rules | Create, Edit, Delete | `manage alert rules` |
| Escalation Chains | Create, Edit, Delete | `manage alert rules` |
| Users | Create, Edit, Deactivate | `manage users` |
| Recipes | Edit | `manage devices` |
| Billing | Generate, Mark Paid | `manage org settings` |
| Compliance | Create, Edit, Complete, Delete | `manage org settings` |
| API Keys | Create, Delete | `manage org settings` |
| Integrations | Configure | `manage org settings` |

**Acceptance Criteria:**
- [ ] Each settings page only shows CRUD buttons to authorized roles
- [ ] site_viewer sees read-only views where applicable
- [ ] technician sees only relevant settings (none currently)

---

#### M6-013: Add `HasRole` to Dashboard Command Center link

**File:** `resources/js/pages/dashboard.tsx` (or navigation config)

**Pattern:**
```tsx
<HasRole role="super_admin">
  <Link href="/command-center">Command Center</Link>
</HasRole>
```

**Acceptance Criteria:**
- [ ] Only super_admin sees Command Center link on dashboard

---

#### M6-014: Add EmptyState to 10 key pages

**Pages + empty conditions:**

| Page | Condition | CTA |
|---|---|---|
| Dashboard | No accessible sites | org_admin: "Create Site" / others: "Contact admin" |
| Alerts Index | No alerts | "All clear — no alerts" (no CTA) |
| Alerts Index | No filter matches | "No alerts match" + "Clear filters" |
| Work Orders Index | No work orders | manager: "Create Work Order" / tech: "No assignments" |
| Work Orders Index | No filter matches | "No work orders match" + "Clear filters" |
| Site Detail | No devices | "Add devices to start monitoring" + Settings link |
| Billing | No invoices | "Generate your first invoice" CTA |
| Billing | No subscription | "No active subscription" info |
| Compliance | No events | "Add your first compliance event" CTA |
| Command Center | No organizations | "Create an organization" CTA |

**Acceptance Criteria:**
- [ ] Each page shows role-appropriate CTA when empty
- [ ] Empty states disappear when data exists
- [ ] i18n: all empty state text wrapped in `t()`

---

#### M6-015: Add Skeleton loading to 10 key pages

**Pages + skeleton patterns (follow activity-log.tsx pattern):**

| Page | Skeleton Layout |
|---|---|
| Dashboard | 4 KPI card skeletons + 6 site card skeletons |
| Alerts Index | Table skeleton (6 rows × 5 cols) |
| Work Orders Index | Table skeleton (6 rows × 5 cols) |
| Site Detail | 4 KPI card skeletons + 4 zone card skeletons |
| Device Detail | Stats skeleton + chart placeholder |
| Reports Index | 4 report type card skeletons |
| Settings: Billing | Plan card skeleton + table skeleton |
| Settings: Users | Table skeleton |
| Command Center | 6 KPI card skeletons + org table skeleton |
| Settings: Sites | Table skeleton |

**Acceptance Criteria:**
- [ ] Skeleton shows during initial page load (before Inertia props resolve)
- [ ] Layout matches actual content (no layout shift)
- [ ] Skeleton uses existing `Skeleton` component from `@/components/ui/skeleton`

---

#### M6-016: Add state transition guards to Alert model

**File:** `app/Models/Alert.php`

**Add method:**
```php
public function canTransitionTo(string $newStatus): bool
{
    $allowed = [
        'active' => ['acknowledged', 'resolved', 'dismissed'],
        'acknowledged' => ['resolved', 'dismissed'],
    ];
    return in_array($newStatus, $allowed[$this->status] ?? []);
}
```

**Update controllers** to call `canTransitionTo()` before changing status.

**Acceptance Criteria:**
- [ ] Invalid transitions (e.g., resolved→active) throw validation error
- [ ] Valid transitions work as before
- [ ] Tests cover all valid + invalid transitions

---

#### M6-017: Add state transition guards to WorkOrder model

**File:** `app/Models/WorkOrder.php`

**Add method** similar to M6-016 with SM-002 transition map:
- open → assigned, in_progress, cancelled
- assigned → in_progress, cancelled
- in_progress → completed, cancelled

**Acceptance Criteria:**
- [ ] Invalid transitions throw validation error
- [ ] completed/cancelled are terminal (no further transitions)

---

## Cycle 3: Client-Side Validation + Polish

> **Focus:** Add Zod schemas to high-value forms, complete defrost suppression.
> **Effort:** ~2 days

### Dev Tasks

| ID | Title | P | Est | Gap Refs | Blocked By |
|---|---|---|---|---|---|
| M6-020 | Add Zod schema to Billing Profile form | P2 | 2h | VL-008 | — |
| M6-021 | Add Zod schema to Escalation Chain form | P2 | 2h | VL-009 | — |
| M6-022 | Add Zod schema to Site create/edit form | P2 | 1h | VL-001 | — |
| M6-023 | Add Zod schema to Device create/edit form | P2 | 1h | VL-002 | — |
| M6-024 | Add Zod schema to User create form | P2 | 1h | VL-010 | — |
| M6-025 | Add Zod schema to Alert Rule form | P2 | 1h | VL-003 | — |
| M6-026 | Add Zod schema to Work Order form | P2 | 45min | VL-004 | — |
| M6-027 | Add Zod schema to Compliance Event form | P2 | 45min | VL-007 | — |
| M6-028 | Complete defrost suppression in RuleEvaluator | P2 | 3h | BR-014 | — |
| M6-029 | Add compliance event overdue scheduled transition | P2 | 1h | SM-006 | — |

---

#### M6-020: Add Zod schema to Billing Profile form

**Objective:** Mexican tax fields (RFC, regimen fiscal, uso CFDI) need client-side validation to prevent round-trips for format errors.

**File:** `resources/js/pages/settings/billing/profiles.tsx`

**Schema:**
```typescript
import { z } from 'zod';

const billingProfileSchema = z.object({
  rfc: z.string().min(12).max(13).regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Invalid RFC format'),
  razon_social: z.string().min(1).max(255),
  regimen_fiscal: z.string().min(1, 'Required'),
  direccion_fiscal: z.object({
    calle: z.string().min(1),
    colonia: z.string().min(1),
    municipio: z.string().min(1),
    estado: z.string().min(1),
    cp: z.string().regex(/^\d{5}$/, 'Must be 5 digits'),
  }),
  uso_cfdi: z.string().min(1, 'Required'),
  email_facturacion: z.string().email('Invalid email'),
});
```

**Migration:** Convert from `useForm` to `form-rhf` with `zodResolver`.

**Acceptance Criteria:**
- [ ] RFC format validated client-side before submit
- [ ] Postal code validated as 5 digits
- [ ] Email validated as email format
- [ ] Server errors still displayed via form-rhf error integration

---

#### M6-028: Complete defrost suppression in RuleEvaluator

**Objective:** Ensure temperature spikes during detected defrost windows do not trigger cold-chain alerts (BR-014).

**File:** `app/Services/Rules/RuleEvaluator.php`

**Current state:** `DefrostDetector` detects defrost patterns but integration into `RuleEvaluator` is partial.

**Required:** Before evaluating cold-chain alert rules, check if current time falls within a detected/confirmed defrost window for the device. If so, skip rule evaluation for temperature metrics.

**Acceptance Criteria:**
- [ ] Temperature spike during confirmed defrost window does NOT trigger alert
- [ ] Temperature spike outside defrost window triggers alert normally
- [ ] Devices without defrost data (non-cold-chain) are unaffected

---

## Cycle 4: Cross-Cutting Sweeps + Launch Prep

> **Focus:** App-wide consistency checks, final polish, documentation updates.
> **Effort:** ~1 day

### Dev Tasks

| ID | Title | P | Est | Gap Refs | Blocked By |
|---|---|---|---|---|---|
| M6-030 | i18n sweep — verify all user-facing text uses `t()` | P3 | 3h | Interaction Conventions | M6-010–015 |
| M6-031 | Mobile responsive audit (375px breakpoint) | P3 | 2h | Interaction Conventions | M6-010–015 |
| M6-032 | Navigation consistency check | P3 | 1h | — | M6-013 |
| M6-033 | Regenerate IMPLEMENTATION_GAP_REPORT.md | P3 | 1h | — | All above |
| M6-034 | Update ASTREA_ROADMAP.md with M6 completion | P3 | 30min | — | M6-033 |

---

#### M6-030: i18n sweep

**Objective:** Verify every user-facing string in pages and components uses `t()` from `laravel-react-i18n`.

**Scope:** All 56 page components + custom components.

**Check:**
- Button labels
- Empty state messages
- Error messages
- Toast messages
- Table headers
- Form labels and placeholders

**Acceptance Criteria:**
- [ ] Zero hardcoded English strings in page components
- [ ] All new strings have Spanish translations in `lang/es.json`

---

#### M6-031: Mobile responsive audit

**Objective:** Verify all pages render correctly at 375px width (iPhone SE).

**Key checks:**
- Data tables: horizontal scroll or stacked layout
- Forms: inputs full-width
- Navigation: sidebar collapses to hamburger
- Cards: single column on mobile
- Touch targets: ≥44px for all interactive elements
- No horizontal scroll on any page

**Acceptance Criteria:**
- [ ] All 56 pages tested at 375px
- [ ] No horizontal scroll issues
- [ ] All action buttons accessible on mobile

---

## Gap → Task Traceability

| Gap Report Item | Task ID | Cycle |
|---|---|---|
| BR-024 not scheduled | M6-001 | 1 |
| BR-027 no overdue transition | M6-002 | 1 |
| BR-038 not scheduled | M6-001 | 1 |
| SM-003 missing overdue job | M6-002 | 1 |
| CC overdue count bug | M6-003 | 1 |
| EXTRA items undocumented | M6-004 | 1 |
| Frontend permission checks MISSING (×8) | M6-010, 011, 012, 013 | 2 |
| EmptyState MISSING (×10) | M6-014 | 2 |
| Skeleton MISSING (×10) | M6-015 | 2 |
| SM-001 no guards | M6-016 | 2 |
| SM-002 no guards | M6-017 | 2 |
| VL-001–010 no frontend validation | M6-020–027 | 3 |
| BR-014 defrost partial | M6-028 | 3 |
| SM-006 no overdue transition | M6-029 | 3 |
| i18n consistency | M6-030 | 4 |
| Mobile responsive | M6-031 | 4 |
| Nav consistency | M6-032 | 4 |
| Gap report refresh | M6-033 | 4 |

---

## Summary

| Metric | Value |
|---|---|
| Total tasks | 24 |
| P0 tasks | 3 (Cycle 1) |
| P1 tasks | 8 (Cycle 2) |
| P2 tasks | 10 (Cycle 3) |
| P3 tasks | 5 (Cycle 4) |
| Estimated total effort | ~6 days |
| Gaps addressed | 34/34 (100%) |

*Tasks are structured for Linear import. Each task has title, objective, file references, acceptance criteria, and gap traceability.*
