# System Behavior Specification

> **Astrea IoT Platform** — Single source of truth for all system rules, state machines, permissions, notifications, validations, and integrations.
> Generated: 2026-03-19 | Phase 5 Playbook Output
> Cross-references: ASTREA_BUSINESS_RULES.md, ASTREA_WORKFLOWS.md, ENTITY_REFERENCE.md

---

## 1. Business Rules (BR-xxx)

Every rule traces to workflows (WF-xxx), is enforced in specific code, and has a severity.

**Severity Key:** CRITICAL = system breaks if violated | HIGH = data integrity risk | MEDIUM = UX issue | LOW = preference

### 1.1 Operational Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-001 | MQTT payloads decoded via DecoderFactory matching device.model (EM300-TH, CT101, WS301, etc.) | CRITICAL | WF-002 | `DecoderFactory`, `ProcessSensorReading` | IMPLEMENTED |
| BR-002 | Sensor readings dual-written: PostgreSQL (permanent) + Redis hash per device (real-time cache) | HIGH | WF-002 | `ReadingStorageService` | IMPLEMENTED |
| BR-003 | Device marked offline after 15 minutes with no reading | HIGH | WF-004 | `CheckDeviceHealth` job, `Device::offline()` scope | IMPLEMENTED |
| BR-004 | Gateway marked offline after 30 minutes with no heartbeat | HIGH | WF-004 | `CheckDeviceHealth` job | IMPLEMENTED |
| BR-005 | Auto-create work order when device offline >2 hours | MEDIUM | WF-004, WF-005 | `CheckDeviceHealth` → `CreateWorkOrder` | IMPLEMENTED |
| BR-006 | Auto-create work order when device battery <20% | MEDIUM | WF-004, WF-005 | `CheckDeviceHealth` → `CreateWorkOrder` | IMPLEMENTED |
| BR-007 | All sensor readings broadcast via Reverb WebSocket to `site.{id}` and `device.{id}` channels | MEDIUM | WF-002 | `SensorReadingReceived` event | IMPLEMENTED |
| BR-008 | Device status auto-recovers to active when new reading received | MEDIUM | WF-002 | `ReadingStorageService` | IMPLEMENTED |
| BR-009 | Redis cache optional — system degrades gracefully to DB-only if Redis unavailable | MEDIUM | WF-002 | `ReadingStorageService`, `RuleEvaluator` | IMPLEMENTED |

### 1.2 Alert Engine Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-010 | Alert rules scoped to site + device, evaluated per-reading | CRITICAL | WF-003 | `RuleEvaluator` | IMPLEMENTED |
| BR-011 | Duration-based threshold: alert fires only after N consecutive readings breach threshold | HIGH | WF-003 | `RuleEvaluator` (Redis/DB state) | IMPLEMENTED |
| BR-012 | Cooldown: no duplicate alert for same rule within `cooldown_minutes` | HIGH | WF-003 | `RuleEvaluator` | IMPLEMENTED |
| BR-013 | Auto-resolution: 2 consecutive normal readings resolve active alert | HIGH | WF-003 | `RuleEvaluator` | IMPLEMENTED |
| BR-014 | Defrost suppression: temperature spikes during defrost windows do not trigger cold-chain alerts | MEDIUM | WF-003 | `RuleEvaluator` → `DefrostDetector` | PARTIAL |
| BR-015 | Alert routing by severity: critical/high → immediate escalation, medium/low → normal queue | HIGH | WF-003 | `AlertRouter` | IMPLEMENTED |
| BR-016 | Alert rate limiting: >5 alerts in 10 minutes triggers batch mode (Redis counter) | MEDIUM | WF-003 | `AlertRouter` → `SendBatchAlertSummary` | IMPLEMENTED |
| BR-017 | Escalation chain: each level has delay_minutes, user_ids, and channels (push/email/whatsapp) | HIGH | WF-003 | `EscalationService`, `EscalationChain.levels` JSON | IMPLEMENTED |
| BR-018 | WhatsApp alert templates include ACK/ESC action keywords for inline response | MEDIUM | WF-003 | `TwilioService` | IMPLEMENTED |
| BR-019 | Alert broadcast via Reverb for real-time dashboard updates | MEDIUM | WF-003 | `AlertTriggered` event | IMPLEMENTED |
| BR-020 | Only active/acknowledged alerts can be resolved or dismissed | CRITICAL | WF-003 | `AlertController`, `AlertApiController` | IMPLEMENTED |

### 1.3 Financial Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-021 | Base subscription fee set per organization, default by segment | HIGH | WF-007 | `SubscriptionService` | IMPLEMENTED |
| BR-022 | Per-sensor monthly pricing: EM300-TH=$150, CT101=$200, WS301=$100, AM307=$175, VS121=$125 | CRITICAL | WF-007 | `SubscriptionService::SENSOR_PRICING` | IMPLEMENTED |
| BR-023 | Monthly total = base_fee × (1 - discount_pct) + Σ(sensor_fees) + gateway_addon_fee | CRITICAL | WF-007 | `SubscriptionService` | IMPLEMENTED |
| BR-024 | Invoice generated per org per period; period must be unique per org | HIGH | WF-007 | `GenerateInvoicesCommand` | IMPLEMENTED |
| BR-025 | CFDI timbrado via Facturapi using org's billing profile (RFC, razon_social, regimen_fiscal) | CRITICAL | WF-007 | `FacturapiService::createCfdi()` | IMPLEMENTED |
| BR-026 | Gateway addon billing: $2,500/month per addon gateway (is_addon=true) | HIGH | WF-007 | `SubscriptionService` | IMPLEMENTED |
| BR-027 | Invoice status flow: draft → sent → paid (or overdue) | HIGH | WF-007 | `BillingController`, SM-003 | IMPLEMENTED |
| BR-028 | SAP/CONTPAQ exports are non-blocking — failure stores local JSON copy | MEDIUM | WF-010 | `SapExportService`, `ContpaqExportService` | IMPLEMENTED |

### 1.4 Access & Authorization Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-029 | All authenticated routes scoped to user's organization via `EnsureOrganizationScope` middleware | CRITICAL | ALL | `EnsureOrganizationScope` middleware | IMPLEMENTED |
| BR-030 | Site access validated via `canAccessSite()`: super_admin=all, org_admin=org sites, others=pivot-assigned | CRITICAL | ALL | `EnsureSiteAccess` middleware, `User::canAccessSite()` | IMPLEMENTED |
| BR-031 | super_admin can switch organizations via session or X-Organization-Id header | HIGH | WF-001 | `EnsureOrganizationScope` | IMPLEMENTED |
| BR-032 | Command Center and Partner Portal restricted to super_admin role (hardcoded) | CRITICAL | WF-001 | Route middleware `role:super_admin` | IMPLEMENTED |
| BR-033 | User permissions cached for 5 minutes in HandleInertiaRequests | LOW | ALL | `HandleInertiaRequests` | IMPLEMENTED |

### 1.5 Communication Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-034 | Morning summary sent at each site's `opening_hour` (timezone-aware) | MEDIUM | WF-006 | `SendMorningSummary` job | IMPLEMENTED |
| BR-035 | Regional summary sent 30 minutes after earliest site opening for each manager | MEDIUM | WF-006 | `SendRegionalSummary` job | IMPLEMENTED |
| BR-036 | Corporate summary sent daily at 08:00 AM to org_admins | MEDIUM | WF-006 | `SendCorporateSummary` job | IMPLEMENTED |
| BR-037 | All summaries deliver via push notification + queued email | MEDIUM | WF-006 | `MorningSummaryMail`, `PushNotificationService` | IMPLEMENTED |
| BR-038 | Compliance reminders sent at 30, 7, and 1 day before due date (tracked in reminders_sent array) | MEDIUM | WF-008 | `SendComplianceRemindersCommand` | IMPLEMENTED |
| BR-039 | Email notifications skipped when mail driver = 'log' (development) | LOW | ALL | `BaseMailable`, `AppServiceProvider` | IMPLEMENTED |

### 1.6 Automation Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-040 | Defrost pattern learning requires 48+ hours of device data | MEDIUM | WF-003 | `DefrostDetector` | IMPLEMENTED |
| BR-041 | Night waste detection: energy consumption between 22:00-06:00 flagged as waste | MEDIUM | WF-006 | `EnergyReport` | IMPLEMENTED |
| BR-042 | Baseline learning: hourly averages grouped by weekday/weekend, anomaly >2 std devs | MEDIUM | WF-003 | `BaselineService` | IMPLEMENTED |
| BR-043 | Recipe application: auto-creates AlertRules from Recipe.default_rules matching device sensor_model | HIGH | WF-011 | `RecipeApplicationService` | IMPLEMENTED |
| BR-044 | Work order completion can auto-resolve linked alert | MEDIUM | WF-005 | `WorkOrder::complete()` | IMPLEMENTED |
| BR-045 | Webhook auto-deactivation: 10 consecutive failures disables webhook subscription | MEDIUM | WF-010 | `WebhookDispatcher` | IMPLEMENTED |
| BR-046 | Push token cleanup: invalid/expired Expo tokens auto-deleted on delivery failure | MEDIUM | WF-003 | `PushNotificationService` | IMPLEMENTED |

### 1.7 Onboarding Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-047 | Site onboarding is a sequential 5-step wizard: gateway → devices → floor plans → modules → escalation → complete | HIGH | WF-001 | `SiteOnboardingController::determineCurrentStep()` | IMPLEMENTED |
| BR-048 | Onboarding completion requires: ≥1 gateway, ≥1 device, ≥1 module activated | CRITICAL | WF-001 | `SiteOnboardingController::complete()` | IMPLEMENTED |
| BR-049 | Organization creation auto-generates subscription with segment-appropriate base_fee | HIGH | WF-001 | `PartnerController::store()` | IMPLEMENTED |
| BR-050 | Module activation auto-applies matching recipes to site devices | HIGH | WF-011 | `SiteOnboardingController::activateModules()` → `RecipeApplicationService` | IMPLEMENTED |

---

## 2. State Machines (SM-xxx)

### SM-001: Alert Lifecycle

```
         ┌──────────┐
         │  active   │
         └──┬──┬──┬──┘
            │  │  │
    ack     │  │  │  resolve/dismiss
            │  │  │
   ┌────────▼┐ │ ┌▼───────────┐
   │ ack'd   │ │ │  resolved   │
   └──┬──┬───┘ │ └─────────────┘
      │  │     │
      │  │     └──────────────┐
      │  │                    │
  ┌───▼──▼───┐          ┌────▼─────┐
  │ resolved  │          │ dismissed │
  └───────────┘          └──────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| active | acknowledged | Acknowledge action | User (site_manager, org_admin, technician) | `acknowledge alerts` permission | Sets acknowledged_at, logs activity |
| active | resolved | Resolve action | User or System | `acknowledge alerts` permission (user) or auto-resolution (system) | Sets resolved_at, resolved_by, resolution_type=manual/auto; NT-001 |
| active | dismissed | Dismiss action | User (site_manager, org_admin) | `manage alert rules` permission | Sets resolved_at, resolution_type=dismissed |
| acknowledged | resolved | Resolve action | User or System | Same as above | Same as above |
| acknowledged | dismissed | Dismiss action | User | Same as above | Same as above |
| resolved | — | TERMINAL | — | — | — |
| dismissed | — | TERMINAL | — | — | — |

**Auto-resolution trigger:** `RuleEvaluator` resolves when 2 consecutive readings are within threshold (BR-013).

### SM-002: Work Order Lifecycle

```
  ┌──────┐     ┌──────────┐     ┌─────────────┐     ┌───────────┐
  │ open │────►│ assigned  │────►│ in_progress  │────►│ completed │
  └──┬───┘     └────┬─────┘     └──────┬───────┘     └───────────┘
     │              │                   │
     │              │                   │
     ▼              ▼                   ▼
  ┌─────────────────────────────────────────┐
  │              cancelled                   │
  └─────────────────────────────────────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| open | assigned | Assign technician | site_manager, org_admin | `manage work orders` | Sets assigned_to; NT-005 push to technician |
| open | in_progress | Start work | technician | `complete work orders` | — |
| open | cancelled | Cancel | site_manager, org_admin | `manage work orders` | — |
| assigned | in_progress | Start work | technician (assigned) | `complete work orders` | — |
| assigned | cancelled | Cancel | site_manager, org_admin | `manage work orders` | — |
| in_progress | completed | Complete work | technician | `complete work orders` | If linked alert, auto-resolves alert (BR-044) |
| in_progress | cancelled | Cancel | site_manager, org_admin | `manage work orders` | — |
| completed | — | TERMINAL | — | — | — |
| cancelled | — | TERMINAL | — | — | — |

### SM-003: Invoice Lifecycle

```
  ┌───────┐      ┌──────┐      ┌──────┐
  │ draft │─────►│ sent │─────►│ paid │
  └───────┘      └──┬───┘      └──────┘
                    │
                    ▼
                ┌─────────┐
                │ overdue  │────►┌──────┐
                └──────────┘     │ paid │
                                 └──────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| draft | sent | Send to customer | org_admin | — | Email with invoice PDF |
| sent | paid | Record payment | org_admin | payment_method required | Sets paid_at, payment_method; CFDI timbrado (BR-025) |
| sent | overdue | Due date passed | System (scheduled) | current_date > due_date | — |
| overdue | paid | Late payment received | org_admin | payment_method required | Sets paid_at, payment_method |
| draft | paid | Direct payment (rare) | org_admin | — | Sets paid_at |
| paid | — | TERMINAL | — | — | — |

### SM-004: Device Status

```
  ┌─────────┐  provisioned   ┌────────┐  no readings >15min  ┌─────────┐
  │ pending │───────────────►│ active  │◄───────────────────►│ offline │
  └─────────┘                └────────┘  new reading arrives  └─────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| pending | active | ChirpStack provisioning | System (onboarding) | Provisioning API success | Sets provisioned_at, status=active |
| active | offline | No reading for 15+ minutes | System (CheckDeviceHealth) | last_reading_at + 15min < now | If >2h: auto-create work order (BR-005) |
| offline | active | New sensor reading received | System (ReadingStorageService) | — | Updates last_reading_at, status=active |

### SM-005: Site Status

```
  ┌─────────────┐  complete()   ┌────────┐  soft delete  ┌──────────┐
  │ onboarding  │──────────────►│ active │──────────────►│ archived │
  └─────────────┘               └────────┘               └──────────┘
```

Onboarding sub-steps: gateway → devices → floor_plans (optional) → modules → escalation → complete

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| onboarding | active | Complete wizard | org_admin | ≥1 gateway, ≥1 device, ≥1 module (BR-048) | Applies recipes (BR-050), starts monitoring |
| active | archived | Soft delete | org_admin | `manage sites` permission | Preserves historical data |

### SM-006: Compliance Event

```
  ┌──────────┐  due date passes  ┌─────────┐
  │ upcoming │──────────────────►│ overdue │
  └────┬─────┘                   └────┬────┘
       │                              │
       │       complete               │ complete
       └──────────┬───────────────────┘
                  ▼
           ┌───────────┐
           │ completed  │
           └───────────┘

  Any state ──cancel──► cancelled
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| upcoming | overdue | Due date passes | System (scheduled) | due_date < today | — |
| upcoming | completed | Mark complete | org_admin | — | Sets completed_at, completed_by |
| overdue | completed | Mark complete (late) | org_admin | — | Sets completed_at, completed_by |
| any | cancelled | Cancel event | org_admin | — | — |
| completed | — | TERMINAL | — | — | — |

**Reminders:** Sent at 30, 7, 1 day before due_date via `ComplianceReminderMail` (BR-038).

### SM-007: Subscription Status

```
  ┌────────┐  pause   ┌────────┐
  │ active │◄────────►│ paused │
  └───┬────┘  resume  └───┬────┘
      │                    │
      │ cancel             │ cancel
      ▼                    ▼
  ┌───────────┐       ┌───────────┐
  │ cancelled │       │ cancelled │
  └───────────┘       └───────────┘
```

### SM-008: Defrost Schedule

```
  ┌──────────┐  pattern detected  ┌──────────┐  user confirms  ┌───────────┐
  │ learning │───────────────────►│ detected │────────────────►│ confirmed │
  └────┬─────┘                    └──────────┘                 └───────────┘
       │
       │ user enters manually
       ▼
  ┌────────┐
  │ manual │
  └────────┘
```

### SM-009: Gateway Status

```
  ┌─────────┐  heartbeat received  ┌────────┐
  │ offline │◄────────────────────►│ online │
  └─────────┘  no heartbeat >30m   └────────┘
```

### SM-010: Alert Notification Delivery

```
  ┌──────┐  provider confirms  ┌───────────┐
  │ sent │────────────────────►│ delivered │
  └──┬───┘                     └───────────┘
     │ provider error
     ▼
  ┌────────┐
  │ failed │
  └────────┘
```

---

## 3. Permission Matrix (PM-xxx)

### PM-001: Role-Permission Assignment

5 roles, 23 permissions. Enforced via Spatie Laravel Permission.

| Permission | super_admin | org_admin | site_manager | site_viewer | technician |
|---|:---:|:---:|:---:|:---:|:---:|
| view organizations | ✅ | | | | |
| manage organizations | ✅ | | | | |
| view sites | ✅ | ✅ | ✅ | ✅ | ✅ |
| manage sites | ✅ | ✅ | ✅ | | |
| onboard sites | ✅ | ✅ | | | |
| view devices | ✅ | ✅ | ✅ | ✅ | ✅ |
| manage devices | ✅ | ✅ | ✅ | | |
| provision devices | ✅ | ✅ | | | |
| view alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| acknowledge alerts | ✅ | ✅ | ✅ | | ✅ |
| manage alert rules | ✅ | ✅ | ✅ | | |
| view users | ✅ | ✅ | ✅ | | |
| manage users | ✅ | ✅ | | | |
| assign site users | ✅ | ✅ | ✅ | | |
| view reports | ✅ | ✅ | ✅ | ✅ | |
| generate reports | ✅ | ✅ | ✅ | | |
| view work orders | ✅ | ✅ | ✅ | | ✅ |
| manage work orders | ✅ | ✅ | ✅ | | |
| complete work orders | ✅ | ✅ | | | ✅ |
| manage org settings | ✅ | ✅ | | | |
| view activity log | ✅ | ✅ | ✅ | | |
| access command center | ✅ | | | | |

### PM-002: Entity-Level Access Control

| Entity | Action | super_admin | org_admin | site_manager | site_viewer | technician | Scope |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Organization** | view | ✅ | | | | | Global |
| | manage | ✅ | | | | | Global |
| **Site** | viewAny | ✅ | ✅ | ✅ | ✅ | ✅ | Org |
| | view | ✅ all | ✅ org | ✅ assigned | ✅ assigned | ✅ assigned | Site-pivot |
| | create | ✅ | ✅ | ✅ | | | Org |
| | update | ✅ | ✅ | ✅ | | | Org |
| | delete | ✅ | ✅ | ✅ | | | Org |
| **Device** | viewAny | ✅ | ✅ | ✅ | ✅ | ✅ | Site |
| | view | ✅ | ✅ | ✅ | ✅ | ✅ | Site-access |
| | create | ✅ | ✅ | ✅ | | | Site |
| | update | ✅ | ✅ | ✅ | | | Site |
| | delete | ✅ | ✅ | ✅ | | | Site |
| | provision | ✅ | ✅ | | | | Site |
| **Alert** | viewAny | ✅ | ✅ | ✅ | ✅ | ✅ | Site |
| | acknowledge | ✅ | ✅ | ✅ | | ✅ | Site |
| | resolve | ✅ | ✅ | ✅ | | ✅ | Site |
| | delete | ✅ | ✅ | ✅ | | | Site |
| **WorkOrder** | viewAny | ✅ | ✅ | ✅ | | ✅ | Site |
| | create | ✅ | ✅ | ✅ | | | Site |
| | update | ✅ | ✅ | ✅ | | | Site |
| | complete | ✅ | ✅ | | | ✅ | Site |
| | delete | ✅ | ✅ | ✅ | | | Site |
| **Report** | viewAny | ✅ | ✅ | ✅ | ✅ | | Site |
| | generate | ✅ | ✅ | ✅ | | | Site |
| **Billing** | viewAny | ✅ | ✅ | | | | Org |
| | create | ✅ | ✅ | | | | Org |
| **Gateway** | viewAny | ✅ | ✅ | ✅ | | | Site-access |
| | create | ✅ | ✅ | ✅ | | | Site-access |
| | delete | ✅ | ✅ | ✅ | | | Site-access |
| **EscalationChain** | viewAny | ✅ | ✅ | ✅ | | | Org |
| | CRUD | ✅ | ✅ | ✅ | | | Org |
| **User** | viewAny | ✅ | ✅ | ✅ | | | Org |
| | create | ✅ | ✅ | | | | Org |
| | update | ✅ | ✅ | | | | Org |
| | delete | ✅ | ✅ | | | | Org |
| **Recipe** | viewAny | ✅ | ✅ | ✅ | ✅ | ✅ | Global (no check) |
| | update | ✅ | ✅ | ✅ | | | Global |
| **File** | view | Owner or public | Owner or public | Owner or public | Owner or public | Owner or public | Owner |
| | update/delete | Owner | Owner | Owner | Owner | Owner | Owner |
| **Notification** | view/update/delete | Own only | Own only | Own only | Own only | Own only | Owner |

### PM-003: Multi-Tenant Scoping

| Scope Level | Mechanism | Enforcement |
|---|---|---|
| Organization | `EnsureOrganizationScope` middleware | Every auth'd request; binds `current_organization` to app container |
| Site | `EnsureSiteAccess` middleware + `User::canAccessSite()` | Route-level for site-scoped resources |
| super_admin org switch | Session `current_org_id` or `X-Organization-Id` header | `EnsureOrganizationScope` |
| org_admin site access | All sites where `site.org_id = user.org_id` | `User::canAccessSite()` |
| Other roles site access | Only pivot-assigned sites via `user_sites` table | `User::accessibleSites()` |

---

## 4. Notification & Communication Map (NT-xxx)

### NT-001: Alert Notification

| Field | Value |
|---|---|
| Event | Alert created (threshold breach) |
| Trigger | `AlertRouter` → `SendAlertNotification` job |
| Recipients | Escalation chain recipients per level |
| Channels | Push + Email + WhatsApp (per escalation chain config) |
| Timing | Immediate (level 1), delayed by `delay_minutes` (levels 2+) |
| Content | Severity badge, device name, metric, value, threshold |
| Workflows | WF-003 |
| Status | IMPLEMENTED |

### NT-002: Batch Alert Summary

| Field | Value |
|---|---|
| Event | >5 alerts in 10 minutes (rate limiting) |
| Trigger | `AlertRouter` → Redis batch → `SendBatchAlertSummary` job |
| Recipients | org_admin users |
| Channels | WhatsApp |
| Timing | Batched (after batch window closes) |
| Content | Summary of recent alerts with counts by severity |
| Workflows | WF-003 |
| Status | IMPLEMENTED |

### NT-003: Morning Summary

| Field | Value |
|---|---|
| Event | Site opening_hour (timezone-aware) |
| Trigger | `SendMorningSummary` job (runs every minute, checks opening_hour) |
| Recipients | Site users + org_admins |
| Channels | Push + Email (`MorningSummaryMail`) |
| Timing | At site opening_hour |
| Content | Device online/offline, 24h alert count, battery status |
| Workflows | WF-006 |
| Status | IMPLEMENTED |

### NT-004: Regional Summary

| Field | Value |
|---|---|
| Event | 30 minutes after earliest site opening |
| Trigger | `SendRegionalSummary` job |
| Recipients | site_managers |
| Channels | Push + Email (`RegionalSummaryMail`) |
| Timing | 30 min after earliest site opening for that manager |
| Content | Multi-site roll-up: device totals, active alerts |
| Workflows | WF-006 |
| Status | IMPLEMENTED |

### NT-005: Corporate Summary

| Field | Value |
|---|---|
| Event | Daily at 08:00 AM |
| Trigger | `SendCorporateSummary` job (scheduled) |
| Recipients | org_admins |
| Channels | Push + Email (`CorporateSummaryMail`) |
| Timing | Daily 08:00 |
| Content | Org-wide: site count, device totals, active alerts |
| Workflows | WF-006 |
| Status | IMPLEMENTED |

### NT-006: Compliance Reminder

| Field | Value |
|---|---|
| Event | Compliance event approaching due date |
| Trigger | `SendComplianceRemindersCommand` |
| Recipients | org_admins |
| Channels | Email (`ComplianceReminderMail`) |
| Timing | 30 days, 7 days, 1 day before due_date |
| Content | Event title, days until due, site name, calendar link |
| Workflows | WF-008 |
| Status | IMPLEMENTED |

### NT-007: Work Order Assignment

| Field | Value |
|---|---|
| Event | Work order assigned or status changed |
| Trigger | `SendWorkOrderNotification` job |
| Recipients | Assigned technician or creator |
| Channels | Push |
| Timing | Immediate |
| Content | Work order title, type, priority |
| Workflows | WF-005 |
| Status | IMPLEMENTED |

### NT-008: Welcome Notification

| Field | Value |
|---|---|
| Event | User registered |
| Trigger | `Registered` event → `WelcomeMail` + `WelcomeNotification` |
| Recipients | New user |
| Channels | Email + Database (in-app) |
| Timing | Immediate |
| Content | Welcome message, dashboard link, onboarding guidance |
| Workflows | WF-009 |
| Status | IMPLEMENTED |

### NT-009: Notification Digest

| Field | Value |
|---|---|
| Event | Scheduled digest |
| Trigger | `notifications:send-digest` command |
| Recipients | Users with unread notifications |
| Channels | Email (`NotificationDigestMail`) |
| Timing | Daily at 08:00, Weekly on Mondays at 09:00 |
| Content | List of unread notifications grouped by type |
| Workflows | — |
| Status | IMPLEMENTED |

### NT-010: Real-time Broadcasts

| Event | Channel | Payload | Purpose |
|---|---|---|---|
| `SensorReadingReceived` | `private:site.{id}`, `private:device.{id}` | device_id, readings, timestamp | Live dashboard updates |
| `AlertTriggered` | `private:site.{id}` | alert details, severity | Real-time alert banner |
| `NotificationCreated` | `private:App.Models.User.{id}` | notification data | Bell icon count update |

---

## 5. Validation Catalog (VL-xxx)

### VL-001: Site

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255 | Required |
| address | string | ❌ | max:500, nullable | — |
| lat | float | ❌ | between:-90,90, nullable | Invalid latitude |
| lng | float | ❌ | between:-180,180, nullable | Invalid longitude |
| timezone | string | ✅ | valid PHP timezone | Invalid timezone |
| opening_hour | time | ❌ | format:H:i, nullable | Invalid time format |
| status | enum | System | onboarding, active | System-managed |

### VL-002: Device

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255 | Required |
| dev_eui | string | ✅ | max:16, unique per site | DevEUI already registered |
| model | string | ✅ | in:EM300-TH,CT101,WS301,AM307,VS121,EM300-MCS,WS202 | Invalid sensor model |
| app_key | string | ✅ (provisioning) | max:32, encrypted | Required for OTAA |
| zone | string | ❌ | max:255, nullable | — |
| gateway_id | FK | ❌ | exists:gateways,id, nullable | Invalid gateway |
| recipe_id | FK | ❌ | exists:recipes,id, nullable | Invalid recipe |

### VL-003: Alert Rule

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255 | Required |
| type | string | ✅ | in:threshold,range,rate_of_change | Invalid rule type |
| conditions | JSON | ✅ | valid JSON with metric, operator, value | Invalid conditions |
| severity | enum | ✅ | in:critical,high,medium,low | Invalid severity |
| cooldown_minutes | integer | ❌ | min:1, default:30 | Must be positive |
| active | boolean | ❌ | default:false | — |

### VL-004: Work Order

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| title | string | ✅ | max:255 | Required |
| type | enum | ✅ | in:battery_replace,sensor_replace,maintenance,inspection,install | Invalid type |
| priority | enum | ❌ | in:low,medium,high,urgent, default:medium | Invalid priority |
| description | text | ❌ | max:2000, nullable | — |
| assigned_to | FK | ❌ | exists:users,id, nullable | Invalid user |

### VL-005: Organization

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255, unique | Required |
| slug | string | System | auto-generated from name | — |
| segment | enum | ✅ | in:cold_chain,energy,industrial,iaq,retail | Invalid segment |
| plan | string | ❌ | max:50, nullable | — |

### VL-006: Invoice

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| period | string | ✅ | format:YYYY-MM, unique per org | Period already invoiced |
| subtotal | decimal | ✅ | min:0, max:999999.99 | Invalid amount |
| iva | decimal | System | 16% of subtotal | — |
| total | decimal | System | subtotal + iva | — |
| payment_method | string | ❌ (required for paid) | in:spei,transfer, nullable | Required when marking paid |

### VL-007: Compliance Event

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| type | enum | ✅ | in:cofepris_audit,certificate_renewal,calibration,inspection,permit_renewal | Invalid type |
| title | string | ✅ | max:255 | Required |
| description | text | ❌ | max:2000, nullable | — |
| due_date | date | ✅ | format:Y-m-d | Required |

### VL-008: Billing Profile

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| rfc | string | ✅ | max:13, Mexican RFC format | Invalid RFC |
| razon_social | string | ✅ | max:255 | Required |
| regimen_fiscal | string | ✅ | valid SAT regime code | Invalid regime |
| direccion_fiscal | JSON | ✅ | object with calle, colonia, municipio, estado, cp | Invalid address |
| uso_cfdi | string | ✅ | valid SAT uso code | Invalid CFDI use |
| email_facturacion | email | ✅ | valid email | Invalid email |

### VL-009: Escalation Chain

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255 | Required |
| levels | JSON | ✅ | array of {level, delay_minutes, user_ids, channels} | Invalid levels |
| levels.*.delay_minutes | integer | ✅ | min:0 | Must be non-negative |
| levels.*.user_ids | array | ✅ | each exists:users,id | Invalid user |
| levels.*.channels | array | ✅ | each in:push,email,whatsapp | Invalid channel |

### VL-010: User

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255 | Required |
| email | email | ✅ | unique:users | Email already registered |
| role | enum | ✅ | in:super_admin,org_admin,site_manager,site_viewer,technician | Invalid role |
| phone | string | ❌ | max:20, nullable | — |
| whatsapp_phone | string | ❌ | max:20, nullable | — |

---

## 6. Integration Map (INT-xxx)

| ID | Service | Purpose | Direction | Auth | Failure Mode | Timeout | Workflows |
|---|---|---|---|---|---|---|---|
| INT-001 | ChirpStack REST API | Device & gateway provisioning | Outbound | Bearer token (`Grpc-Metadata-Authorization`) | Log error, return false, update device status | 30s | WF-001 |
| INT-002 | ChirpStack MQTT | Sensor data ingestion, gateway status | Inbound | MQTT subscription | Log warning, skip malformed messages | — | WF-002 |
| INT-003 | Facturapi | CFDI invoice generation + PDF/XML download | Outbound | Bearer token | RuntimeException on create failure, null on download failure | 30s | WF-007 |
| INT-004 | SAP | Invoice export, journal entries, readings CSV | Outbound | `X-API-Key` + `X-Company-Code` headers | Store local JSON copy, log error, non-blocking | 30s | WF-010 |
| INT-005 | CONTPAQ | Invoice export, product catalog sync | Outbound | `X-API-Key` header | Store local JSON copy, log error, non-blocking | 30s | WF-010 |
| INT-006 | Twilio (WhatsApp) | Alert notifications via WhatsApp | Outbound + Webhook | Basic auth (SID + Token) | Log error, return false, graceful skip | 30s | WF-003 |
| INT-007 | Expo Push API | Mobile push notifications | Outbound | None (service-to-service) | Log error, auto-delete invalid tokens | 30s | WF-003, WF-005, WF-006 |
| INT-008 | Custom Webhooks | Event dispatch to subscriber URLs | Outbound | HMAC-SHA256 signature | Track failure count, auto-deactivate after 10 failures | 10s | WF-010 |

### Integration Criticality

| Integration | Criticality | Impact if Down |
|---|---|---|
| ChirpStack MQTT (INT-002) | **CRITICAL** | No sensor data ingestion — entire monitoring pipeline stops |
| ChirpStack REST (INT-001) | **HIGH** | Cannot provision new devices/gateways — onboarding blocked |
| Facturapi (INT-003) | **HIGH** | Cannot generate CFDI invoices — billing compliance blocked (Mexico) |
| Expo Push (INT-007) | **MEDIUM** | No mobile push notifications — email/WhatsApp fallback available |
| Twilio (INT-006) | **MEDIUM** | No WhatsApp alerts — push/email fallback available |
| SAP/CONTPAQ (INT-004/005) | **LOW** | Export delayed — local copies stored, non-blocking |
| Webhooks (INT-008) | **LOW** | External integrations delayed — auto-retry with failure tracking |

---

## Cross-Reference Index

### Rule → Workflow Mapping

| Workflow | Business Rules | State Machines | Permissions | Notifications |
|---|---|---|---|---|
| WF-001 Client Onboarding | BR-047, BR-048, BR-049, BR-050 | SM-005 (Site) | PM: onboard sites, manage sites | NT-008 (Welcome) |
| WF-002 Sensor Data Pipeline | BR-001, BR-002, BR-007, BR-008, BR-009 | SM-004 (Device) | — (system) | NT-010 (Broadcast) |
| WF-003 Alert Lifecycle | BR-010–BR-020, BR-014, BR-040, BR-042 | SM-001 (Alert), SM-010 (Notification) | PM: view/acknowledge alerts, manage alert rules | NT-001, NT-002 |
| WF-004 Device Health | BR-003, BR-004, BR-005, BR-006 | SM-004 (Device), SM-009 (Gateway) | — (system) | NT-007 |
| WF-005 Work Orders | BR-005, BR-006, BR-044 | SM-002 (WorkOrder) | PM: view/manage/complete work orders | NT-007 |
| WF-006 Morning Summaries | BR-034, BR-035, BR-036, BR-037, BR-041 | — | PM: view reports | NT-003, NT-004, NT-005 |
| WF-007 Billing | BR-021–BR-028 | SM-003 (Invoice), SM-007 (Subscription) | PM: manage org settings (billing) | — |
| WF-008 Compliance | BR-038 | SM-006 (ComplianceEvent) | PM: manage org settings | NT-006 |
| WF-009 User Management | — | — | PM: view/manage users, assign site users | NT-008 |
| WF-010 Integration Export | BR-028, BR-045 | — | PM: manage org settings | — |
| WF-011 Module System | BR-043, BR-050 | — | PM: manage devices | — |
| WF-012 White-Label | — | — | PM: manage org settings | — |
