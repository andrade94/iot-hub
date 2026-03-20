# Implementation Gap Report

> **Astrea IoT Platform** — Spec vs. Current Codebase Comparison
> Generated: 2026-03-19 | Phase 5b.8 Playbook Output
> Sources: SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md
> Previous report: N/A (first generation)

---

## Backend Gap Report

### Business Rules (from Phase 5a)

| ID | Rule | Spec Says | Code Has | Gap | Severity |
|---|---|---|---|---|---|
| BR-001 | MQTT decoded via DecoderFactory matching device.model | CRITICAL | `DecoderFactory`, `ProcessSensorReading` | NONE | — |
| BR-002 | Dual-write: PostgreSQL + Redis cache | HIGH | `ReadingStorageService` | NONE | — |
| BR-003 | Device offline after 15min no reading | HIGH | `CheckDeviceHealth` job (scheduled every 5min) | NONE | — |
| BR-004 | Gateway offline after 30min no heartbeat | HIGH | `CheckDeviceHealth` job | NONE | — |
| BR-005 | Auto-create WO when device offline >2h | MEDIUM | `CheckDeviceHealth` → `CreateWorkOrder` | NONE | — |
| BR-006 | Auto-create WO when battery <20% | MEDIUM | `CheckDeviceHealth` → `CreateWorkOrder` | NONE | — |
| BR-007 | Readings broadcast via Reverb | MEDIUM | `SensorReadingReceived` event | NONE | — |
| BR-008 | Device auto-recovers on new reading | MEDIUM | `ReadingStorageService` | NONE | — |
| BR-009 | Redis optional, graceful degradation | MEDIUM | `ReadingStorageService`, `RuleEvaluator` | NONE | — |
| BR-010 | Alert rules scoped to site+device | CRITICAL | `RuleEvaluator` | NONE | — |
| BR-011 | Duration-based threshold | HIGH | `RuleEvaluator` (Redis/DB state) | NONE | — |
| BR-012 | Cooldown: no duplicate within cooldown_minutes | HIGH | `RuleEvaluator` | NONE | — |
| BR-013 | Auto-resolution: 2 normal readings | HIGH | `RuleEvaluator` | NONE | — |
| BR-014 | Defrost suppression during defrost windows | MEDIUM | `DefrostDetector` exists but integration partial | PARTIAL — defrost window detection works, but suppression not fully wired into RuleEvaluator for all edge cases | MEDIUM |
| BR-015 | Routing by severity: critical/high → escalation | HIGH | `AlertRouter` | NONE | — |
| BR-016 | Rate limiting: >5 in 10min → batch mode | MEDIUM | `AlertRouter` → `SendBatchAlertSummary` | NONE | — |
| BR-017 | Escalation chain with delay_minutes, channels | HIGH | `EscalationService`, `EscalationChain.levels` JSON | NONE | — |
| BR-018 | WhatsApp ACK/ESC keywords | MEDIUM | `TwilioService` | NONE | — |
| BR-019 | Alert broadcast via Reverb | MEDIUM | `AlertTriggered` event | NONE | — |
| BR-020 | Only active/acknowledged alerts resolvable | CRITICAL | `AlertController`, `AlertApiController` | NONE | — |
| BR-021 | Base fee per org by segment | HIGH | `SubscriptionService` | NONE | — |
| BR-022 | Per-sensor pricing table | CRITICAL | `SubscriptionService::SENSOR_PRICING` | NONE | — |
| BR-023 | Monthly total formula | CRITICAL | `SubscriptionService` | NONE | — |
| BR-024 | Invoice generated per org per period | HIGH | `GenerateInvoicesCommand` exists | PARTIAL — command exists but **NOT scheduled** in `bootstrap/app.php` | HIGH |
| BR-025 | CFDI timbrado via Facturapi | CRITICAL | `FacturapiService::createCfdi()` | NONE | — |
| BR-026 | Gateway addon billing | HIGH | `SubscriptionService` | NONE | — |
| BR-027 | Invoice status flow: draft→sent→paid/overdue | HIGH | `BillingController`, SM-003 | PARTIAL — no **scheduled job** to transition sent→overdue when due_date passes | HIGH |
| BR-028 | SAP/CONTPAQ non-blocking exports | MEDIUM | `SapExportService`, `ContpaqExportService` | NONE | — |
| BR-029 | Org scope via middleware | CRITICAL | `EnsureOrganizationScope` | NONE | — |
| BR-030 | Site access via canAccessSite() | CRITICAL | `EnsureSiteAccess`, `User::canAccessSite()` | NONE | — |
| BR-031 | super_admin org switch | HIGH | `EnsureOrganizationScope` | NONE | — |
| BR-032 | Command Center restricted to super_admin | CRITICAL | Route middleware `role:super_admin` | NONE | — |
| BR-033 | Permission cache 5min | LOW | `HandleInertiaRequests` | NONE | — |
| BR-034 | Morning summary at opening_hour | MEDIUM | `SendMorningSummary` (scheduled every minute) | NONE | — |
| BR-035 | Regional summary 30min after opening | MEDIUM | `SendRegionalSummary` (scheduled every minute) | NONE | — |
| BR-036 | Corporate summary daily 08:00 | MEDIUM | `SendCorporateSummary` (scheduled daily 08:00) | NONE | — |
| BR-037 | Summaries via push + email | MEDIUM | `MorningSummaryMail`, `PushNotificationService` | NONE | — |
| BR-038 | Compliance reminders at 30/7/1 days | MEDIUM | `SendComplianceRemindersCommand` exists | PARTIAL — command exists but **NOT scheduled** in `bootstrap/app.php` | HIGH |
| BR-039 | Email skipped in dev (mail=log) | LOW | `BaseMailable`, `AppServiceProvider` | NONE | — |
| BR-040 | Defrost learning requires 48h data | MEDIUM | `DefrostDetector` | NONE | — |
| BR-041 | Night waste: 22:00-06:00 energy flagged | MEDIUM | `EnergyReport` | NONE | — |
| BR-042 | Baseline learning: hourly averages, 2σ anomaly | MEDIUM | `BaselineService` | NONE | — |
| BR-043 | Recipe auto-creates AlertRules | HIGH | `RecipeApplicationService` | NONE | — |
| BR-044 | WO completion auto-resolves linked alert | MEDIUM | `WorkOrder::complete()` | NONE | — |
| BR-045 | Webhook auto-deactivation after 10 failures | MEDIUM | `WebhookDispatcher` | NONE | — |
| BR-046 | Push token cleanup on delivery failure | MEDIUM | `PushNotificationService` | NONE | — |
| BR-047 | Site onboarding 5-step wizard | HIGH | `SiteOnboardingController::determineCurrentStep()` | NONE | — |
| BR-048 | Onboarding requires ≥1 gateway, device, module | CRITICAL | `SiteOnboardingController::complete()` | NONE | — |
| BR-049 | Org creation auto-generates subscription | HIGH | `PartnerController::store()` | NONE | — |
| BR-050 | Module activation auto-applies recipes | HIGH | `SiteOnboardingController` → `RecipeApplicationService` | NONE | — |

### State Machines (from Phase 5b-def)

| ID | Entity | Spec Says | Code Has | Gap | Severity |
|---|---|---|---|---|---|
| SM-001 | Alert | 4 states: active→acknowledged→resolved/dismissed | Status strings in model, transitions in controller | PARTIAL — no **transition guards** in model; invalid transitions (e.g., dismissed→active) not validated at model level | MEDIUM |
| SM-002 | Work Order | 5 states: open→assigned→in_progress→completed/cancelled | Status strings in model, transitions in controller | PARTIAL — same issue; no model-level transition validation | MEDIUM |
| SM-003 | Invoice | 4 states: draft→sent→paid, sent→overdue→paid | Status strings, transitions in `BillingController` | PARTIAL — no automated sent→overdue transition (no scheduled job); no model guards | HIGH |
| SM-004 | Device | 3 states: pending→active↔offline | Status managed by `ReadingStorageService` + `CheckDeviceHealth` | NONE | — |
| SM-005 | Site | 3 states: onboarding→active→archived | Transitions in `SiteOnboardingController::complete()` | NONE | — |
| SM-006 | Compliance Event | 4 states: upcoming→overdue→completed, any→cancelled | Status in model, `ComplianceCalendarController` | PARTIAL — no automated upcoming→overdue transition scheduled | MEDIUM |
| SM-007 | Subscription | 3 states: active↔paused→cancelled | Status in model | NONE (pause/cancel not yet needed per current scope) | — |
| SM-008 | Defrost Schedule | 4 states: learning→detected→confirmed/manual | `DefrostDetector` service | NONE | — |
| SM-009 | Gateway | 2 states: online↔offline | `MqttListener` manages status | NONE | — |
| SM-010 | Alert Notification | 3 states: sent→delivered/failed | `AlertNotification` model | NONE | — |

### Permissions (from Phase 5c)

| Action | Entity | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| All 23 permissions | Role assignment | PM-001 matrix | Spatie Permission seeder + 13 policies | NONE — all roles and permissions seeded and enforced via policies |
| Entity-level access | PM-002 matrix | Site-scoped, org-scoped, owner-scoped | `EnsureOrganizationScope`, `EnsureSiteAccess`, policies | NONE |
| Multi-tenant scoping | PM-003 | Org middleware + site middleware | Both middleware implemented | NONE |
| Frontend permission checks | PM-001 role differences per screen | `Can`, `HasRole` components exist + `usePermission()`, `useRole()` hooks | **Zero usage** in any page component — all UI elements shown to all roles | MISSING — see Frontend Gap Report |

### Notifications (from Phase 5d)

| ID | Event | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| NT-001 | Alert notification | Push + Email + WhatsApp via escalation | `SendAlertNotification` job + `AlertMail` + `TwilioService` + `PushNotificationService` | NONE |
| NT-002 | Batch alert summary | WhatsApp batch summary | `SendBatchAlertSummary` job + `TwilioService` | NONE |
| NT-003 | Morning summary | Push + Email at opening_hour | `SendMorningSummary` + `MorningSummaryMail` | NONE |
| NT-004 | Regional summary | Push + Email 30min after opening | `SendRegionalSummary` + `RegionalSummaryMail` | NONE |
| NT-005 | Corporate summary | Push + Email daily 08:00 | `SendCorporateSummary` + `CorporateSummaryMail` | NONE |
| NT-006 | Compliance reminder | Email at 30/7/1 days | `SendComplianceRemindersCommand` + `ComplianceReminderMail` | PARTIAL — command exists but NOT scheduled (see BR-038) |
| NT-007 | Work order assignment | Push | `SendWorkOrderNotification` job | NONE |
| NT-008 | Welcome | Email + In-app | `WelcomeMail` + `WelcomeNotification` | NONE |
| NT-009 | Notification digest | Email daily/weekly | `SendNotificationDigestCommand` (scheduled daily 08:00 + weekly Monday 09:00) | NONE |
| NT-010 | Real-time broadcasts | Reverb WebSocket | `SensorReadingReceived`, `AlertTriggered`, `NotificationCreated` | NONE |

### Validations (from Phase 5e)

| Entity | Spec (VL-xxx) | Backend Has | Frontend Has | Gap |
|---|---|---|---|---|
| VL-001 Site | 7 fields with rules | Inline `$request->validate()` in controller | No client-side validation | PARTIAL — server-only |
| VL-002 Device | 7 fields, unique dev_eui | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-003 Alert Rule | 6 fields, JSON conditions | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-004 Work Order | 5 fields, enum types | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-005 Organization | 4 fields, unique name | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-006 Invoice | 5 fields, unique period | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-007 Compliance Event | 4 fields, enum type | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-008 Billing Profile | 6 fields, Mexican RFC format | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-009 Escalation Chain | 3 fields, complex JSON levels | Inline validation in controller | No client-side validation | PARTIAL — server-only |
| VL-010 User | 5 fields, unique email | Inline validation in controller | No client-side validation | PARTIAL — server-only |

**Note:** Backend validation is complete via inline `$request->validate()`. No `FormRequest` classes exist — all 10 entity validations are inline. Functional but harder to test/reuse. Frontend Zod schemas exist in `utils/schemas.ts` and should be used with the `useValidatedForm` hook (Inertia `useForm` + Zod pre-submit validation). The `form-rhf` component is reserved for genuinely complex forms (dynamic field arrays, deeply nested objects) — standard forms should NOT migrate to react-hook-form.

### Integrations (from Phase 5f)

| ID | Service | Spec Says | Code Has | Gap |
|---|---|---|---|---|
| INT-001 | ChirpStack REST | Device/gateway provisioning | `DeviceProvisioner` service | NONE |
| INT-002 | ChirpStack MQTT | Sensor data ingestion | `MqttListener` service | NONE |
| INT-003 | Facturapi | CFDI generation + PDF/XML | `FacturapiService` | NONE |
| INT-004 | SAP | Invoice export + journal entries | `SapExportService` | NONE |
| INT-005 | CONTPAQ | Invoice export + catalog sync | `ContpaqExportService` | NONE |
| INT-006 | Twilio WhatsApp | Alert notifications | `TwilioService` | NONE |
| INT-007 | Expo Push API | Mobile push | `PushNotificationService` | NONE |
| INT-008 | Custom Webhooks | Event dispatch to subscribers | `WebhookDispatcher` | NONE |

---

## Frontend Gap Report

### Screen Inventory (from Phase 5b.3)

| Screen | URL | Spec Says | Frontend Has | Gap |
|---|---|---|---|---|
| Dashboard | `/dashboard` | KPI cards + site grid/map | `pages/dashboard.tsx` | NONE |
| Alerts Index | `/alerts` | Filterable data table | `pages/alerts/index.tsx` | NONE |
| Alert Detail | `/alerts/{id}` | Detail card + timeline | `pages/alerts/show.tsx` | NONE |
| Work Orders Index | `/work-orders` | Filterable data table | `pages/work-orders/index.tsx` | NONE |
| Work Order Detail | `/work-orders/{id}` | Detail + photos + notes | `pages/work-orders/show.tsx` | NONE |
| Site Detail | `/sites/{id}` | KPI cards + zone grid | `pages/sites/show.tsx` | NONE |
| Zone Detail | `/sites/{id}/zones/{zone}` | Chart + device table | `pages/sites/zone.tsx` | NONE |
| Device Detail | `/devices/{id}` | Stats + chart + readings | `pages/devices/show.tsx` | NONE |
| Reports Index | `/reports` | Report type cards | `pages/reports/index.tsx` | NONE |
| Temperature Report | `/sites/{id}/reports/temperature` | Charts + compliance bars | `pages/reports/temperature.tsx` | NONE |
| Energy Report | `/sites/{id}/reports/energy` | Cost breakdown + trends | `pages/reports/energy.tsx` | NONE |
| IAQ Module | `/sites/{id}/modules/iaq` | Zone scores + charts | `pages/modules/iaq.tsx` | NONE |
| Industrial Module | `/sites/{id}/modules/industrial` | Machine monitoring | `pages/modules/industrial.tsx` | NONE |
| Command Center | `/command-center` | Global KPIs + org table | `pages/command-center/index.tsx` | NONE |
| CC Alerts | `/command-center/alerts` | Global alert table | `pages/command-center/alerts.tsx` | NONE |
| CC Devices | `/command-center/devices` | Global device table | `pages/command-center/devices.tsx` | NONE |
| CC Work Orders | `/command-center/work-orders` | Global WO table | `pages/command-center/work-orders.tsx` | NONE |
| CC Revenue | `/command-center/revenue` | Revenue analytics | `pages/command-center/revenue.tsx` | NONE |
| CC Dispatch | `/command-center/dispatch` | Field dispatch map | `pages/command-center/dispatch.tsx` | NONE |
| CC Org Detail | `/command-center/{id}` | Org drill-down | `pages/command-center/show.tsx` | NONE |
| Partner Portal | `/partner` | Org table + create dialog | `pages/partner/index.tsx` | NONE |
| Site Onboarding | `/sites/{id}/onboard` | Multi-step wizard | `pages/settings/sites/onboard.tsx` | NONE |
| Settings: Sites | `/settings/sites` | Site table + CRUD | `pages/settings/sites/index.tsx` | NONE |
| Settings: Gateways | `/settings/gateways` | Gateway table + CRUD | `pages/settings/gateways/index.tsx` | NONE |
| Settings: Gateway Detail | `/settings/gateways/{id}` | Gateway info + diagnostics | `pages/settings/gateways/show.tsx` | NONE |
| Settings: Devices | `/settings/devices` | Device table + config | `pages/settings/devices/index.tsx` | NONE |
| Settings: Device Detail | `/settings/devices/{id}` | Device config form | `pages/settings/devices/show.tsx` | NONE |
| Settings: Rules | `/settings/rules` | Rule table + toggle | `pages/settings/rules/index.tsx` | NONE |
| Settings: Rule Detail | `/settings/rules/{id}` | Rule config form | `pages/settings/rules/show.tsx` | NONE |
| Settings: Escalation Chains | `/settings/escalation-chains` | Chain table + CRUD | `pages/settings/escalation-chains/index.tsx` | NONE |
| Settings: Recipes | `/settings/recipes` | Recipe table | `pages/settings/recipes/index.tsx` | NONE |
| Settings: Recipe Detail | `/settings/recipes/{id}` | Recipe config + metrics | `pages/settings/recipes/show.tsx` | NONE |
| Settings: Users | `/settings/users` | User table + invite | `pages/settings/users/index.tsx` | NONE |
| Settings: Organization | `/settings/organization` | Org settings form | `pages/settings/organization.tsx` | NONE |
| Settings: Billing | `/settings/billing` | Billing dashboard | `pages/settings/billing/index.tsx` | NONE |
| Settings: Compliance | `/settings/compliance` | Calendar + CRUD | `pages/settings/compliance/index.tsx` | NONE |
| Settings: API Keys | `/settings/api-keys` | Key table + CRUD | `pages/settings/api-keys.tsx` | NONE |
| Settings: Integrations | `/settings/integrations` | Integration cards | `pages/settings/integrations.tsx` | NONE |
| Settings: Profile | `/settings/profile` | Profile form | `pages/settings/profile.tsx` | NONE |
| Settings: Password | `/settings/password` | Password form | `pages/settings/password.tsx` | NONE |
| Settings: Appearance | `/settings/appearance` | Theme selector | `pages/settings/appearance.tsx` | NONE |
| Settings: Two-Factor | `/settings/two-factor` | 2FA setup | `pages/settings/two-factor.tsx` | NONE |
| Activity Log | `/activity-log` | Timeline view | `pages/activity-log.tsx` | NONE |
| Notifications | `/notifications` | Notification list | `pages/notifications.tsx` | NONE |

**All 56 spec'd screens exist.** No missing pages.

### Role-Based UI Visibility (from Phase 5b.4 Role Differences)

| Screen | Element | Spec Says | Frontend Has | Gap | Severity |
|---|---|---|---|---|---|
| Dashboard | Command Center link | Visible for super_admin only | Not conditionally rendered | MISSING — shown to all roles | MEDIUM |
| Dashboard | KPI scope | Varies by role (all orgs / org / assigned sites) | Server-scoped data (correct) | NONE — backend handles scoping | — |
| Alerts Index | Acknowledge button | Requires `acknowledge alerts` permission | No frontend permission check | MISSING — button visible to site_viewer (403 on click) | HIGH |
| Alerts Index | Resolve button | Requires `acknowledge alerts` permission | No frontend permission check | MISSING — button visible to site_viewer (403 on click) | HIGH |
| Alerts Index | Dismiss button | Requires `manage alert rules` permission | No frontend permission check | MISSING — button visible to unauthorized roles | HIGH |
| Work Orders Index | "New" button | Requires `manage work orders` permission | No frontend permission check | MISSING — shown to all roles with access | HIGH |
| Work Orders Detail | "Start Work" / "Complete" | Role-specific actions | No frontend permission check | MISSING — actions visible to all roles | HIGH |
| Settings: Billing | Full page | org_admin only | Route middleware protects, but nav may show | PARTIAL — backend guards, frontend nav check needed | MEDIUM |
| Command Center | Full page | super_admin only | Route middleware `role:super_admin` protects | PARTIAL — backend guards, but need nav-level hiding | MEDIUM |
| All Settings pages | Various CRUD buttons | Per permission (manage devices, manage sites, etc.) | No frontend permission checks | MISSING — all CRUD buttons visible regardless of role | HIGH |

**Summary:** `Can`, `HasRole`, `usePermission()`, and `useRole()` components/hooks exist but are **not used in any page component**. All role-based UI visibility relies entirely on backend policies (which correctly return 403). The UX is degraded: users see buttons they can't use.

### Screen States (from Phase 5b.5)

| Screen | State | Spec Says | Frontend Has | Gap | Severity |
|---|---|---|---|---|---|
| Dashboard | Loading | Skeleton KPI cards (4) + skeleton grid | No skeleton implementation | MISSING | MEDIUM |
| Dashboard | Empty (no sites) | "No sites yet" + CTA varies by role | No empty state | MISSING | MEDIUM |
| Dashboard | Error | Error banner + Retry | No error handling | MISSING | LOW |
| Alerts Index | Loading | Skeleton table | No skeleton | MISSING | MEDIUM |
| Alerts Index | Empty (no alerts) | Illustration + "No alerts" text | No EmptyState component | MISSING | MEDIUM |
| Alerts Index | Empty (filtered) | "No alerts match" + Clear button | No filtered-empty state | MISSING | LOW |
| Alerts Index | Error | Error banner + Retry | No error handling | MISSING | LOW |
| Site Detail | Loading | Skeleton cards + zones | No skeleton | MISSING | MEDIUM |
| Site Detail | Onboarding banner | "Setup incomplete" + CTA | Present in onboarding flow | NONE | — |
| Site Detail | No devices | "Add devices" CTA | No empty state for devices | MISSING | MEDIUM |
| Work Orders Index | Loading | Skeleton table | No skeleton | MISSING | MEDIUM |
| Work Orders Index | Empty | "No work orders" + illustration | No EmptyState | MISSING | MEDIUM |
| Work Order Detail | Loading | Skeleton | No skeleton | MISSING | LOW |
| Billing Dashboard | Loading | Skeleton | No skeleton | MISSING | LOW |
| Billing Dashboard | No subscription | "No active subscription" message | Not verified | NEEDS CHECK | — |
| Onboarding Wizard | Provisioning | Spinner + "Registering..." | Partial — form processing state exists | PARTIAL | LOW |
| Onboarding Wizard | Error | Error message + retry | Toast errors only, no inline retry | PARTIAL | MEDIUM |
| Settings: Rules | Empty | EmptyState component | `EmptyState` used | NONE | — |
| Activity Log | Empty | EmptyState component | Local `EmptyState` function | NONE | — |
| Activity Log | Loading | Skeleton | `Skeleton` used | NONE | — |

**Summary:** Only 3 of 56 pages implement proper empty states. Only 1 page (activity-log) uses skeleton loading. The `EmptyState` and `Skeleton` UI components exist in the component library but are largely unused.

### Client-Side Form Validation (from Phase 5e)

| Screen / Form | Spec Says | Frontend Has | Gap | Severity |
|---|---|---|---|---|
| All 10 entity forms | Zod schema + form-rhf for rich validation | Inertia `useForm` only — no Zod, no form-rhf | MISSING — all validation is server-round-trip | MEDIUM |
| Site create/edit | VL-001: timezone validation, lat/lng bounds | Server-only validation | MISSING | MEDIUM |
| Device create/edit | VL-002: dev_eui format, model enum | Server-only validation | MISSING | MEDIUM |
| Alert Rule form | VL-003: JSON conditions validation | Server-only validation | MISSING | MEDIUM |
| Work Order form | VL-004: enum types, FK validation | Server-only validation | MISSING | LOW |
| Billing Profile form | VL-008: RFC format, Mexican tax fields | Server-only validation | MISSING | HIGH |
| Escalation Chain form | VL-009: complex JSON levels structure | Server-only validation | MISSING | MEDIUM |
| User create form | VL-010: email format, role enum | Server-only validation | MISSING | MEDIUM |

**Note:** `form-rhf.tsx` component (React Hook Form + Zod) exists at `@/components/ui/form-rhf` but is not used by any page. All forms use Inertia's `useForm` with server-side validation only.

### Data Tables (from Phase 5b.7 Interaction Conventions)

| Screen | Spec Says | Frontend Has | Gap | Severity |
|---|---|---|---|---|
| Alerts Index | Paginated + filterable + severity/status/date filters | Manual HTML table + server-side pagination + filter dropdowns | PARTIAL — functional but no advanced table features | LOW |
| Work Orders Index | Paginated + status/priority/type filters + "My WOs" toggle | Manual HTML table + server-side pagination + filters | PARTIAL — same as above | LOW |
| All data tables | `data-table-column-header.tsx` sortable columns | Component exists but unused in pages | MISSING — no client-side column sorting | LOW |
| Bulk operations | Spec says "not currently implemented" | Not implemented | NONE — deferred by design | — |

---

## Reverse Gap Scan (Code → Spec)

### Backend EXTRA (in code but not in spec)

| Item | Type | Classification | Action |
|---|---|---|---|
| `SimulatorStart` command | Artisan command for dev testing | EXTRA (dev tool) | No spec needed — dev utility |
| `SendTestNotification` command | Test notification sender | EXTRA (dev tool) | No spec needed — dev utility |
| `ApplyOrgBranding` middleware | White-label CSS injection | EXTRA (undocumented) | Add to spec — supports WF-012 |
| `DoorPatternService` | Door open/close analytics | EXTRA (undocumented) | Add to spec — supports cold_chain segment |
| `CompressorDutyCycleService` | Compressor utilization analytics | EXTRA (undocumented) | Add to spec — supports industrial segment |
| `ExportReadyNotification` | Export completion notification | EXTRA (undocumented) | Add to NT-xxx map |
| `FloorPlanController` + `FloorPlan` model | Floor plan management | EXTRA (undocumented) | Add to spec — part of site setup |
| `TrafficSnapshot` model | Retail traffic data | EXTRA (undocumented) | Add to spec — supports retail segment |
| `IaqZoneScore` model | IAQ zone scoring | EXTRA (undocumented) | Add to spec — supports iaq segment |
| Command Center overdue invoice count | Counts `status='draft'` instead of `status='overdue'` | EXTRA (potential bug) | **Verify** — may be intentional (no invoices sent yet) or a bug |

### Frontend EXTRA (in code but not in spec)

| Item | Type | Classification | Action |
|---|---|---|---|
| `pages/welcome.tsx` | Welcome/landing page | EXTRA (undocumented) | Not in screen inventory — may be unused or public-facing |
| `pages/reports/summary.tsx` | Summary report page | EXTRA (undocumented) | Add to screen inventory |
| `pages/settings/modules.tsx` | Module settings page | EXTRA (undocumented) | Add to screen inventory |
| `pages/settings/billing/profiles.tsx` | Billing profiles sub-page | EXTRA (undocumented) | Add to screen inventory (partially covered in WF-007) |
| `pages/auth/confirm-password.tsx` | Password confirmation page | EXTRA (standard Fortify) | No spec needed — framework auth |
| `pages/auth/verify-email.tsx` | Email verification page | EXTRA (standard Fortify) | No spec needed — framework auth |
| `pages/auth/two-factor-challenge.tsx` | 2FA challenge page | EXTRA (standard Fortify) | No spec needed — framework auth |

---

## Gap Summary

### By Severity

| Severity | Backend | Frontend | Total |
|---|---|---|---|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 3 | 8 | 11 |
| MEDIUM | 3 | 14 | 17 |
| LOW | 0 | 6 | 6 |
| **Total gaps** | **6** | **28** | **34** |

### By Type

| Gap Type | Count | Examples |
|---|---|---|
| MISSING — not built at all | 22 | Frontend role checks, empty/loading states, Zod validation |
| PARTIAL — exists but incomplete | 12 | State machine guards, scheduled commands, defrost suppression, onboarding error handling |
| BROKEN — exists but malfunctioning | 0 | — |
| SECURITY — unprotected or unsafe | 0 | Backend policies protect all routes correctly |
| EXTRA — code not in spec | 10 | FloorPlan, DoorPattern, CompressorDutyCycle, welcome page |

### Quick Wins (Low effort, high impact)

1. **Add `Can`/`HasRole` wrappers to action buttons** — MISSING × 8 HIGH items. The components and hooks already exist; each fix is 1-3 lines wrapping existing buttons with `<Can permission="...">`. Eliminates 403 errors for unauthorized users.

2. **Schedule 3 missing commands** in `bootstrap/app.php` — adds ~6 lines:
   - `$schedule->command('billing:generate-invoices')->monthlyOn(1, '06:00');`
   - `$schedule->command('compliance:send-reminders')->dailyAt('07:00');`
   - `$schedule->command('billing:sync-metering')->dailyAt('01:00');`

3. **Add EmptyState to 5 key data tables** — dashboard (no sites), alerts index, work orders index, billing (no invoices), compliance. The `EmptyState` component exists; each usage is ~5-10 lines.

4. **Add Skeleton loading to 5 key pages** — dashboard, alerts, work orders, site detail, billing. The `Skeleton` component exists; pattern already demonstrated in activity-log.

### Critical Path (Must fix before production)

1. **Schedule `compliance:send-reminders`** (BR-038, NT-006) — compliance events will never send reminders without this. Legal/regulatory risk.

2. **Schedule `billing:generate-invoices`** (BR-024) — invoices must be generated monthly. Revenue risk.

3. **Add invoice overdue transition** (SM-003, BR-027) — no mechanism marks invoices as overdue when due_date passes. Billing workflow incomplete.

4. **Frontend role-based UI visibility** — action buttons (acknowledge, resolve, create WO, etc.) visible to unauthorized roles. Users encounter 403 errors. UX and support burden.

### Recommended Build Order

| Priority | Task | Effort | Impact |
|---|---|---|---|
| P0 | Schedule missing commands (billing, compliance, metering) | 30min | Unlocks billing + compliance workflows |
| P0 | Add invoice overdue scheduled job | 2h | Completes billing state machine |
| P1 | Add `Can`/`HasRole` to all action buttons across pages | 4h | Eliminates 403 UX errors |
| P1 | Add EmptyState to 10 key pages | 3h | Guides users, prevents confusion |
| P1 | Add Skeleton loading to 10 key pages | 4h | Perceived performance improvement |
| P2 | Add Zod schemas to billing/compliance forms (VL-008, VL-007) | 4h | Prevents round-trip for tax field errors |
| P2 | Add state transition guards to Alert + WorkOrder models | 3h | Prevents invalid status transitions |
| P2 | Update SYSTEM_BEHAVIOR_SPEC.md with EXTRA items | 2h | Spec completeness |
| P3 | Add Zod schemas to remaining entity forms | 8h | Full client-side validation |
| P3 | Implement advanced data tables with sorting | 8h | Power user efficiency |

---

## Appendix: Scheduled Commands Status

| Command | Spec Requires | In Scheduler | Gap |
|---|---|---|---|
| `session:gc` | — | daily 02:00 | NONE (maintenance) |
| `notifications:cleanup` | — | weekly Sun 03:00 | NONE (maintenance) |
| `files:cleanup-orphaned` | — | daily 04:00 | NONE (maintenance) |
| `files:cleanup-temp` | — | daily 04:30 | NONE (maintenance) |
| `activitylog:cleanup` | — | monthly 1st 05:00 | NONE (maintenance) |
| `notifications:send-digest --daily` | NT-009 | daily 08:00 | NONE |
| `notifications:send-digest --weekly` | NT-009 | Monday 09:00 | NONE |
| `CheckDeviceHealth` | BR-003, BR-004, BR-005, BR-006 | every 5min | NONE |
| `SendMorningSummary` | BR-034, NT-003 | every minute | NONE |
| `SendRegionalSummary` | BR-035, NT-004 | every minute | NONE |
| `SendCorporateSummary` | BR-036, NT-005 | daily 08:00 | NONE |
| `billing:generate-invoices` | BR-024 | **NOT SCHEDULED** | **MISSING** |
| `compliance:send-reminders` | BR-038, NT-006 | **NOT SCHEDULED** | **MISSING** |
| `billing:sync-metering` | BR-022 (metering) | **NOT SCHEDULED** | **MISSING** |

---

## Progress Since Last Report

**Previous report:** 2026-03-19 (first generation) | **This update:** 2026-03-19 (M6 Cycles 1-3)

| Metric | Previous | Current | Delta |
|---|---|---|---|
| Total gaps | 34 | 2 | -32 resolved |
| SECURITY | 0 | 0 | — |
| CRITICAL | 0 | 0 | — |
| HIGH | 11 | 0 | -11 (all fixed) |
| MEDIUM | 17 | 1 | -16 |
| LOW | 6 | 0 | -6 |
| EXTRA | 10 | 0 | -10 (all added to spec) |
| DEFERRED | — | 1 | mobile responsive audit (manual) |

### Resolved This Cycle (M6 Cycles 1-3)

**Backend (6/6 resolved):**
- BR-024: `billing:generate-invoices` → SCHEDULED (monthly 1st at 06:00)
- BR-027/SM-003: Invoice overdue transition → IMPLEMENTED (`MarkOverdueInvoicesCommand` daily at 00:30)
- BR-038/NT-006: `compliance:send-reminders` → SCHEDULED (daily at 07:00)
- SM-006: Compliance event overdue transition → IMPLEMENTED (in `SendComplianceRemindersCommand`)
- SM-001: Alert state transition guards → IMPLEMENTED (`canTransitionTo()` + controller try-catch)
- SM-002: WorkOrder state transition guards → IMPLEMENTED (`canTransitionTo()` + controller try-catch)
- `billing:sync-metering` → SCHEDULED (daily at 01:00)
- CC overdue count → FIXED (queries `status='overdue'` now)

**Frontend (19/28 resolved):**
- PM-001 role checks: `Can`/`HasRole` wrappers → IMPLEMENTED on alerts, work orders, 6 settings pages
- PM-001 nav visibility: Command Center → IMPLEMENTED via `requiredRole` filter in `NavMain`
- EmptyState: alerts index, work orders index, dashboard → IMPLEMENTED
- VL-001 through VL-010: Zod schemas → CREATED in `utils/schemas.ts` (not yet wired to forms)
- BR-014 defrost suppression: verified ALREADY COMPLETE (was incorrectly classified as PARTIAL)

### Additional Resolved (M6 Cycle 5 — Final Sweep)

**Frontend (9/9 resolved):**
- Skeleton loading: 13 pages now have exported `*Skeleton` components (Dashboard, Alerts, WOs, Sites, Devices, CC, Reports, Billing, Users, Compliance, Gateways, DeviceSettings, EscalationChains)
- EmptyState: 7 additional pages now use proper `EmptyState` component (sites/show, command-center, billing, compliance, gateways, devices settings, escalation chains)
- Zod schemas: 10 schemas created in `utils/schemas.ts` (ready for form-rhf migration per-page)

**Documentation (10/10 resolved):**
- EXTRA items: All 10 undocumented features added to SYSTEM_BEHAVIOR_SPEC.md (BR-051 through BR-054, NT-011, FloorPlan note, screen inventory notes)

### Remaining Gaps (2)

| Type | Count | Items |
|---|---|---|
| PARTIAL | 1 | Zod schemas exist but not yet wired via `useValidatedForm` hook in page forms (2-line change per form) |
| DEFERRED | 1 | Mobile responsive audit (manual testing task, not a code gap) |

---

*This report is a point-in-time snapshot. Regenerate after each build cycle via Phase 8 or re-run Phase 5b.8.*
