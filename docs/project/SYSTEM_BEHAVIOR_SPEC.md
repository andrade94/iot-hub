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
| BR-047 | Site onboarding is a sequential 5-step wizard: gateway → devices → floor plans → modules → escalation → complete. **Note:** Floor plans (FloorPlan model + FloorPlanController) are an optional sub-step in the onboarding wizard — sites can complete onboarding without uploading floor plans. | HIGH | WF-001 | `SiteOnboardingController::determineCurrentStep()` | IMPLEMENTED |
| BR-048 | Onboarding completion requires: ≥1 gateway, ≥1 device, ≥1 module activated | CRITICAL | WF-001 | `SiteOnboardingController::complete()` | IMPLEMENTED |
| BR-049 | Organization creation auto-generates subscription with segment-appropriate base_fee | HIGH | WF-001 | `PartnerController::store()` | IMPLEMENTED |
| BR-050 | Module activation auto-applies matching recipes to site devices | HIGH | WF-011 | `SiteOnboardingController::activateModules()` → `RecipeApplicationService` | IMPLEMENTED |

### 1.8 Segment Analytics Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-051 | Door open/close pattern analytics for cold-chain segment — tracks door frequency, average open duration, and correlates with temperature excursions | MEDIUM | WF-002 | `DoorPatternService` | IMPLEMENTED |
| BR-052 | Compressor duty cycle analytics for industrial segment — tracks on/off cycles, utilization percentage, and detects abnormal patterns | MEDIUM | WF-002 | `CompressorDutyCycleService` | IMPLEMENTED |
| BR-053 | Retail traffic snapshot analytics — stores periodic customer count data from VS121 sensors for retail segment sites | MEDIUM | WF-002 | `TrafficSnapshot` model | IMPLEMENTED |
| BR-054 | IAQ zone scoring — calculates composite air quality scores per zone from AM307 sensor data (CO2, PM2.5, humidity, temperature) | MEDIUM | WF-002, WF-011 | `IaqZoneScore` model | IMPLEMENTED |

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

### NT-011: Export Ready Notification

| Field | Value |
|---|---|
| Event | Export job completed |
| Trigger | Export job finishes processing |
| Recipients | Requesting user |
| Channels | Database (in-app) |
| Timing | Immediate (upon job completion) |
| Content | Export file ready for download |
| Workflows | WF-010 |
| Status | IMPLEMENTED |

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

### Middleware: ApplyOrgBranding

> **Note (cross-ref WF-012 White-Label):** The `ApplyOrgBranding` middleware applies organization-specific CSS variables and branding (logo, colors, fonts) on every authenticated page load. It reads `current_organization.settings` and shares branding data via Inertia, enabling white-label customization per organization.

---

## Cross-Reference Index

### Rule → Workflow Mapping

| Workflow | Business Rules | State Machines | Permissions | Notifications |
|---|---|---|---|---|
| WF-001 Client Onboarding | BR-047, BR-048, BR-049, BR-050 | SM-005 (Site) | PM: onboard sites, manage sites | NT-008 (Welcome) |
| WF-002 Sensor Data Pipeline | BR-001, BR-002, BR-007, BR-008, BR-009, BR-051, BR-052, BR-053, BR-054 | SM-004 (Device) | — (system) | NT-010 (Broadcast) |
| WF-003 Alert Lifecycle | BR-010–BR-020, BR-014, BR-040, BR-042 | SM-001 (Alert), SM-010 (Notification) | PM: view/acknowledge alerts, manage alert rules | NT-001, NT-002 |
| WF-004 Device Health | BR-003, BR-004, BR-005, BR-006 | SM-004 (Device), SM-009 (Gateway) | — (system) | NT-007 |
| WF-005 Work Orders | BR-005, BR-006, BR-044 | SM-002 (WorkOrder) | PM: view/manage/complete work orders | NT-007 |
| WF-006 Morning Summaries | BR-034, BR-035, BR-036, BR-037, BR-041 | — | PM: view reports | NT-003, NT-004, NT-005 |
| WF-007 Billing | BR-021–BR-028 | SM-003 (Invoice), SM-007 (Subscription) | PM: manage org settings (billing) | — |
| WF-008 Compliance | BR-038 | SM-006 (ComplianceEvent) | PM: manage org settings | NT-006 |
| WF-009 User Management | — | — | PM: view/manage users, assign site users | NT-008 |
| WF-010 Integration Export | BR-028, BR-045 | — | PM: manage org settings | NT-011 (Export Ready) |
| WF-011 Module System | BR-043, BR-050, BR-054 | — | PM: manage devices | — |
| WF-012 White-Label | — | — | PM: manage org settings | — |

### Additional Screen Inventory (Undocumented Pages)

The following pages exist in the codebase but were not captured in the original workflow-to-UI mapping:

| Screen | Path | Workflows | Notes |
|---|---|---|---|
| Report Summary | `resources/js/pages/reports/summary.tsx` | WF-006 | Aggregated report summary view for site/org-level reporting |
| Module Settings | `resources/js/pages/settings/modules.tsx` | WF-011 | Module activation/deactivation configuration per site |
| Billing Profiles | `resources/js/pages/settings/billing/profiles.tsx` | WF-007 | Manage organization billing profiles (RFC, razon_social, regimen_fiscal) for CFDI generation |

---

# Phase 10: Operational Completeness — System Behavior Spec

> **Scope:** 17 pre-launch features closing the gap between "monitoring tool" and "operational platform."
> **Generated:** 2026-03-19 | Phase 5 --focus phase-10
> **Themes:** Compliance & Audit Loop | Operational Reliability | UX at Scale

---

## 1. Business Rules — Phase 10 (BR-055 → BR-096)

### 1.9 Corrective Action Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-055 | Temperature excursion or critical alert requires corrective action before compliance report inclusion | CRITICAL | WF-013 | `CorrectiveActionController`, `TemperatureReport` | IMPLEMENTED |
| BR-056 | Corrective action must record: action_taken (text), taken_by (user), taken_at (timestamp) | HIGH | WF-013 | `CorrectiveAction` model, `StoreCorrectiveActionRequest` | IMPLEMENTED |
| BR-057 | Corrective action verification must be by a different user than who logged it | HIGH | WF-013 | `CorrectiveActionController::verify()` guard, `CorrectiveActionPolicy::verify()` | IMPLEMENTED |
| BR-058 | Compliance report PDF includes: excursion timestamp, duration, corrective action taken, who, when | CRITICAL | WF-013, WF-006 | `TemperatureReport::generatePdf()` | PARTIAL (model + UI done, PDF template pending) |

### 1.10 Device Replacement Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-059 | Device replacement auto-transfers: zone, floor plan position (x/y), recipe assignment, alert rule bindings from old device to new device | CRITICAL | WF-014 | `DeviceReplacementService::replace()` | IMPLEMENTED |
| BR-060 | Old device status set to `replaced`; sets `replaced_at` and `replaced_by_device_id` | HIGH | WF-014 | `DeviceReplacementService::replace()` | IMPLEMENTED |
| BR-061 | New device inherits all config, starts with status `pending` → provisions in ChirpStack → `active` on first reading | HIGH | WF-014 | `DeviceReplacementService` + `ReadingStorageService` auto-activate | IMPLEMENTED |
| BR-062 | Old device readings preserved under old dev_eui; new device starts clean history | HIGH | WF-014 | Separate device records (by design) | IMPLEMENTED |
| BR-063 | Activity log: "Device X replaced by Device Y by User Z" | MEDIUM | WF-014 | `DeviceReplacementService` → `activity()` | IMPLEMENTED |

### 1.11 Data Export & Offboarding Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-064 | Organization data export generates ZIP: sensor readings (CSV), alerts (CSV), user list (CSV, excl passwords) | CRITICAL | WF-015 | `ExportOrganizationData` job | IMPLEMENTED |
| BR-065 | Export is async; emails download link when ready with 48h expiry | HIGH | WF-015 | `ExportOrganizationData` → `ExportReadyNotification` | IMPLEMENTED |
| BR-066 | Offboarding workflow: org_admin requests export → super_admin deactivates subscription → data archived → hard delete after 12 months | HIGH | WF-015 | `OffboardingService` | PARTIAL (export works, full offboarding flow not yet wired) |

### 1.12 Alert Analytics & Tuning Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-067 | Alert analytics aggregates: top 10 noisiest rules, dismissal rate, avg response time, 30/90 day trends, resolution breakdown | HIGH | WF-016 | `AlertAnalyticsService` (getSummary, getNoisiestRules, getTrend, getResolutionBreakdown) | IMPLEMENTED |
| BR-068 | "Suggested tuning" recommendation generated when a rule fires >50x/week | MEDIUM | WF-016 | `AlertAnalyticsService::getSuggestedTuning()` | IMPLEMENTED |

### 1.13 Scheduled Report Delivery Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-069 | Report schedule runs daily job, checks all active schedules, generates + emails to recipients_json | HIGH | WF-017 | `SendScheduledReports` job (daily at 06:00) | IMPLEMENTED |
| BR-070 | Report types: temperature_compliance, energy_summary, alert_summary, executive_overview | HIGH | WF-017 | `ReportSchedule::TYPES` constant | IMPLEMENTED |
| BR-071 | Frequencies: daily, weekly, monthly — weekly runs on configured day_of_week, monthly on 1st | MEDIUM | WF-017 | `ReportSchedule::shouldFireToday()` | IMPLEMENTED |
| BR-072 | Default schedule on site activation: weekly temperature_compliance to org_admin every Monday 08:00 | MEDIUM | WF-017, WF-001 | `SiteOnboardingController::complete()` | NOT IMPLEMENTED (manual creation only) |

### 1.14 Maintenance Window Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-073 | During active maintenance window, suppress ALL alerts for the affected zone at that site | CRITICAL | WF-018 | `RuleEvaluator::evaluateRule()` → `MaintenanceWindow::isActiveForZone()` | IMPLEMENTED |
| BR-074 | Maintenance windows support recurrence (once, daily, weekly, monthly) | MEDIUM | WF-018 | `MaintenanceWindow::isActiveNow()` recurrence logic | IMPLEMENTED |
| BR-075 | Activity log entry when maintenance window changes | LOW | WF-018 | `MaintenanceWindow` LogsActivity trait | IMPLEMENTED |
| BR-076 | Maintenance windows are per-SITE, per-ZONE — different from per-user quiet hours | HIGH | WF-018 | `MaintenanceWindow` model (site_id + zone fields) | IMPLEMENTED |

### 1.15 Mass Offline Detection Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-077 | If >50% of devices at a site go offline within 5 minutes → create ONE site-level alert, suppress individual device offline work orders | CRITICAL | WF-019 | `CheckDeviceHealth` → `MassOfflineDetector::check()` | IMPLEMENTED |
| BR-078 | Check gateway status first: if gateway offline → "Gateway offline" alert (not individual device alerts) | HIGH | WF-019 | `MassOfflineDetector::isGatewayOffline()` | IMPLEMENTED |
| BR-079 | Cross-site pattern: >3 sites go offline simultaneously → "Upstream outage" alert to super_admin only | HIGH | WF-019, WF-020 | `MassOfflineDetector::checkCrossSitePattern()` | PARTIAL (method exists, not wired to auto-trigger) |

### 1.16 Upstream Outage Declaration Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-080 | While outage is active: suppress ALL offline alerts platform-wide, show banner on all dashboards | CRITICAL | WF-020 | `OutageDeclaration::isActive()` in `RuleEvaluator` + `CheckDeviceHealth` + `HandleInertiaRequests` | IMPLEMENTED |
| BR-081 | When outage ended: resume normal monitoring, send summary of missed alerts during outage window | HIGH | WF-020 | `OutageDeclaration::resolve()` resumes monitoring; missed alert summary NOT YET IMPLEMENTED | PARTIAL |
| BR-082 | Only super_admin can declare and end outages | CRITICAL | WF-020 | `CommandCenterController` routes gated by `role:super_admin` middleware | IMPLEMENTED |

### 1.17 LFPDPPP Consent Tracking Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-083 | First login or account creation requires privacy policy acceptance — store `privacy_accepted_at` + `privacy_policy_version` on User | CRITICAL | WF-021 | `EnsurePrivacyConsent` middleware, User model | IMPLEMENTED |
| BR-084 | On policy version update: re-prompt acceptance on next login (compare stored version vs current) | HIGH | WF-021 | `EnsurePrivacyConsent` middleware (compares `privacy_policy_version` vs `config('app.privacy_policy_version')`) | IMPLEMENTED |
| BR-085 | Data export (BR-064) includes consent records as part of LFPDPPP data portability | MEDIUM | WF-015, WF-021 | `ExportOrganizationData` exports users with timestamps | IMPLEMENTED |

### 1.18 Sensor Data Sanity Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-086 | Per-model valid ranges enforced before storage: EM300-TH: -40 to 85°C; CT101: 0 to 100A; WS301: open/close only; AM307: CO2 0-5000ppm, PM2.5 0-1000μg/m³; VS121: 0-500 count | CRITICAL | WF-002 | `SanityCheckService::validate()`, called in `ProcessSensorReading` | IMPLEMENTED |
| BR-087 | Reading outside valid range → discard reading, log anomaly to `device_anomalies` table, do NOT store in sensor_readings, do NOT trigger alerts | CRITICAL | WF-002 | `SanityCheckService`, `ReadingStorageService` | IMPLEMENTED |
| BR-088 | 5+ invalid readings from same device in 1 hour → create alert "Sensor X sending invalid data — possible hardware failure" | HIGH | WF-002 | `SanityCheckService::checkAnomalyThreshold()` | IMPLEMENTED |

### 1.19 Site Template Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-089 | Template captures: activated modules, zone_config, recipe assignments, escalation chain structure | HIGH | WF-022 | `SiteTemplateService::capture()` | IMPLEMENTED |
| BR-090 | On clone: pre-fills modules, zone names, recipe assignments, escalation chain structure on new site | HIGH | WF-022, WF-001 | `SiteTemplateService::applyToSite()` | IMPLEMENTED |
| BR-091 | Technician only needs: register gateway serial + scan dev_euis + place on floor plan (template handles rest) | MEDIUM | WF-022 | `SiteOnboardingController` template integration | PARTIAL (service ready, onboarding wizard not yet integrated) |

### 1.20 Health Check & Platform Monitoring Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-092 | `GET /health` returns JSON: db_connection (bool), redis_connection (bool), queue_depth (int), last_mqtt_reading_at (timestamp) | HIGH | WF-023 | `HealthCheckController::__invoke()` | IMPLEMENTED |
| BR-093 | If any health check fails → external monitoring service receives non-200 response | HIGH | WF-023 | `HealthCheckController` (HTTP 503 when degraded) | IMPLEMENTED |

### 1.21 Alert Delivery Monitoring Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-094 | Track WhatsApp sent/delivered/failed (24h), Push sent/delivered/failed (24h), Email bounce rate per org | HIGH | WF-024 | `CommandCenterController::getDeliveryHealth()` queries `AlertNotification` | IMPLEMENTED |
| BR-095 | Per-org breakdown: which clients have delivery issues — surface in Command Center | MEDIUM | WF-024 | `CommandCenterController::index()` returns `deliveryHealth` prop | IMPLEMENTED (platform-wide; per-org breakdown deferred) |

### 1.22 Duplicate Reading Protection Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-096 | Unique constraint on `(device_id, time, metric)` in sensor_readings table; use `INSERT ... ON CONFLICT DO NOTHING` | CRITICAL | WF-002 | Migration `2026_03_20_000001` + `ReadingStorageService::insertOrIgnore()` | IMPLEMENTED |

### 1.23 Zero Readings Detection Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-097 | Scheduled check every 5 minutes: "Were ANY readings received platform-wide in last 10 minutes?" | CRITICAL | WF-025 | `DetectPlatformOutage` job (everyFiveMinutes in scheduler) | IMPLEMENTED |
| BR-098 | If zero readings → immediate alert to super_admin: "No sensor data received in 10 minutes — possible MQTT/ChirpStack outage" | CRITICAL | WF-025 | `DetectPlatformOutage` → `PlatformOutageAlert` notification (Redis dedup) | IMPLEMENTED |

### 1.24 Dashboard Action Cards Rules

| ID | Rule | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|
| BR-099 | Dashboard "Needs Attention" section displays: unacknowledged alerts count, overdue work orders count, critical battery sensors count — each with direct link to filtered view | MEDIUM | WF-026 | `DashboardController` returns `actionCards` prop | IMPLEMENTED |
| BR-100 | Action cards are role-aware: site_viewer sees alerts only; technician sees alerts + work orders; site_manager+ sees all three | MEDIUM | WF-026 | Cards rendered client-side, scoped by accessible sites | IMPLEMENTED |

---

## 2. State Machines — Phase 10 (SM-011 → SM-014)

### SM-011: Corrective Action Lifecycle

```
  ┌────────┐  verify (different user)  ┌──────────┐
  │ logged │──────────────────────────►│ verified  │
  └────────┘                           └──────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| logged | verified | Verify action | site_manager, org_admin | Must be different user than taken_by (BR-057) | Sets verified_by, verified_at; included in compliance report |
| verified | — | TERMINAL | — | — | — |

**Notes:**
- Simple two-state lifecycle. Corrective actions cannot be deleted once logged (audit trail).
- Unverified actions appear with ⚠️ warning in compliance reports.

### SM-012: Data Export Lifecycle

```
  ┌────────┐  job starts  ┌────────────┐  success  ┌───────────┐  48h  ┌─────────┐
  │ queued │────────────►│ processing  │─────────►│ completed  │─────►│ expired │
  └────────┘              └─────┬──────┘           └───────────┘      └─────────┘
                                │ error
                           ┌────▼───┐
                           │ failed │
                           └────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| queued | processing | Job starts execution | System (`ExportOrganizationData` job) | — | — |
| processing | completed | All files generated, ZIP created | System | ZIP file exists on disk | NT-013 (Export Ready email with download link) |
| processing | failed | Exception during generation | System | — | Log error, notify requesting user |
| completed | expired | 48 hours after completion | System (scheduled cleanup) | `completed_at + 48h < now` | Delete ZIP file from storage |
| failed | queued | Manual retry | org_admin | Max 3 retries | Reset attempt counter |

### SM-013: Outage Declaration Lifecycle

```
  ┌──────────┐  end outage  ┌──────────┐
  │  active  │─────────────►│ resolved │
  └──────────┘              └──────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| (none) | active | Declare outage | super_admin | `access command center` permission | NT-016 (banner to all orgs), suppress all offline alerts (BR-080) |
| active | resolved | End outage | super_admin | `access command center` permission | NT-017 (resume notification + missed alert summary), resume monitoring (BR-081) |
| resolved | — | TERMINAL | — | — | — |

**Notes:**
- Only one outage can be active at a time (enforced by unique constraint on `status='active'`).
- `declared_at`, `declared_by`, `resolved_at`, `resolved_by`, `reason` (text), `affected_services` (JSON).

### SM-004 Extension: Device `replaced` State

```
  ┌─────────┐  provisioned   ┌────────┐  no readings >15min  ┌─────────┐
  │ pending │───────────────►│ active  │◄───────────────────►│ offline │
  └─────────┘                └───┬────┘  new reading arrives  └────┬────┘
                                 │                                 │
                          replace│                          replace │
                                 ▼                                 ▼
                            ┌──────────┐
                            │ replaced  │  ← TERMINAL (new)
                            └──────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| active | replaced | Device replacement | technician, site_manager, org_admin | `manage devices` permission, new_dev_eui provided | Transfer config (BR-059), set replaced_at/replaced_by_device_id (BR-060), log activity (BR-063) |
| offline | replaced | Device replacement | technician, site_manager, org_admin | Same as above | Same as above |
| replaced | — | TERMINAL | — | — | Readings preserved, device hidden from active views |

---

## 3. Permission Matrix — Phase 10 (PM-004)

### PM-004: Phase 10 Entity-Level Access Control

| Action | Entity | super_admin | org_admin | site_manager | site_viewer | technician | Scope |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Log corrective action** | CorrectiveAction | ✅ | ✅ | ✅ | ✅ | ✅ | Site |
| **Verify corrective action** | CorrectiveAction | ✅ | ✅ | ✅ | | | Site (different user than logger, BR-057) |
| **Replace device** | Device | ✅ | ✅ | ✅ | | ✅ | Site (`manage devices` or `complete work orders`) |
| **Trigger data export** | DataExport | ✅ | ✅ | | | | Org (`manage org settings`) |
| **View alert analytics** | AlertAnalytics | ✅ | ✅ | ✅ | | | Org/Site |
| **Configure report schedules** | ReportSchedule | ✅ | ✅ | | | | Org (`manage org settings`) |
| **CRUD maintenance windows** | MaintenanceWindow | ✅ | ✅ | ✅ | | | Site (`manage sites`) |
| **Declare/end outage** | OutageDeclaration | ✅ | | | | | Global (`access command center`) |
| **Create/manage site templates** | SiteTemplate | ✅ | ✅ | | | | Org (`manage org settings`) |
| **Use site template (onboarding)** | SiteTemplate | ✅ | ✅ | ✅ | | | Org (`onboard sites`) |
| **View health check** | HealthCheck | ✅ | | | | | Global (`access command center`) |
| **View delivery monitoring** | AlertDeliveryMonitoring | ✅ | | | | | Global (`access command center`) |
| **View dashboard action cards** | DashboardActionCards | ✅ | ✅ | ✅ | ✅ | ✅ | Site (filtered by role permissions) |

### New Permissions Required

| Permission | Description | Assigned To |
|---|---|---|
| `log corrective actions` | Log corrective actions on alerts | super_admin, org_admin, site_manager, site_viewer, technician |
| `verify corrective actions` | Verify another user's corrective action | super_admin, org_admin, site_manager |
| `manage report schedules` | Configure automated report delivery | super_admin, org_admin |
| `manage maintenance windows` | CRUD maintenance windows per site/zone | super_admin, org_admin, site_manager |
| `manage site templates` | Create and manage site configuration templates | super_admin, org_admin |
| `export organization data` | Trigger LFPDPPP data export | super_admin, org_admin |
| `view alert analytics` | View alert tuning dashboard | super_admin, org_admin, site_manager |

**Note:** `access command center` (existing) gates: outage declaration, health check, delivery monitoring.
**Note:** `manage devices` (existing) gates: device replacement flow.

---

## 4. Notification & Communication Map — Phase 10 (NT-012 → NT-020)

### NT-012: Corrective Action Reminder

| Field | Value |
|---|---|
| Event | Critical/high alert excursion with no corrective action logged after 2 hours |
| Trigger | `SendCorrectiveActionReminder` job (runs hourly, checks unresolved excursions) |
| Recipients | Site users with `log corrective actions` permission |
| Channels | Push + In-app |
| Timing | 2 hours after excursion, repeat every 4 hours until logged |
| Content | "Alert [name] at [site] requires corrective action for compliance — [X] hours since excursion" |
| Workflows | WF-013 |
| Status | NOT IMPLEMENTED |

### NT-013: Data Export Ready

| Field | Value |
|---|---|
| Event | Organization data export ZIP completed |
| Trigger | `ExportOrganizationData` job completion |
| Recipients | Requesting org_admin |
| Channels | Email + In-app (database) |
| Timing | Immediate upon completion |
| Content | Download link (48h expiry), file size, record counts per category |
| Workflows | WF-015 |
| Status | PARTIAL (ExportReadyNotification class exists, job does not) |

### NT-014: Scheduled Report Delivery

| Field | Value |
|---|---|
| Event | Scheduled report time reached |
| Trigger | `SendScheduledReports` job (runs daily, checks all active schedules) |
| Recipients | `recipients_json` from ReportSchedule record |
| Channels | Email (attached PDF) |
| Timing | Per schedule: daily, weekly (day_of_week), monthly (1st) at configured time |
| Content | Report PDF (temperature_compliance, energy_summary, alert_summary, or executive_overview) |
| Workflows | WF-017 |
| Status | NOT IMPLEMENTED |

### NT-015: Outage Declared

| Field | Value |
|---|---|
| Event | super_admin declares upstream outage |
| Trigger | `OutageDeclarationService::declare()` |
| Recipients | All org_admins |
| Channels | Email + In-app + Reverb broadcast (banner) |
| Timing | Immediate |
| Content | "Platform experiencing upstream issues — monitoring temporarily degraded. Declared by [user] at [time]. Reason: [reason]" |
| Workflows | WF-020 |
| Status | NOT IMPLEMENTED |

### NT-016: Outage Resolved

| Field | Value |
|---|---|
| Event | super_admin ends outage |
| Trigger | `OutageDeclarationService::resolve()` |
| Recipients | All org_admins |
| Channels | Email + In-app + Reverb broadcast (banner removal) |
| Timing | Immediate |
| Content | "Platform monitoring restored. Outage duration: [X hours]. [N] alerts were suppressed during outage — review recommended." |
| Workflows | WF-020 |
| Status | NOT IMPLEMENTED |

### NT-017: Mass Offline / Site-Level Alert

| Field | Value |
|---|---|
| Event | >50% devices at site offline within 5 minutes OR gateway offline |
| Trigger | `MassOfflineDetector` (called from `CheckDeviceHealth`) |
| Recipients | Site escalation chain (level 1) |
| Channels | Push + WhatsApp + Email |
| Timing | Immediate |
| Content | "Possible power outage or gateway failure at [site] — [N] of [M] devices offline. Gateway status: [online/offline]" |
| Workflows | WF-019 |
| Status | NOT IMPLEMENTED |

### NT-018: Zero Readings Platform Alert

| Field | Value |
|---|---|
| Event | No sensor readings received platform-wide in 10 minutes |
| Trigger | `DetectPlatformOutage` job (runs every 5 minutes) |
| Recipients | All super_admin users |
| Channels | Email + Push + SMS (if configured) |
| Timing | Immediate |
| Content | "No sensor data received platform-wide in [X] minutes — possible MQTT/ChirpStack outage. Last reading at [timestamp]." |
| Workflows | WF-025 |
| Status | NOT IMPLEMENTED |

### NT-019: Sensor Anomaly Alert

| Field | Value |
|---|---|
| Event | Device sends 5+ invalid readings in 1 hour |
| Trigger | `SanityCheckService::checkAnomalyThreshold()` |
| Recipients | Site technicians + site_manager |
| Channels | Push + In-app |
| Timing | Immediate (once per hour per device, cooldown) |
| Content | "Sensor [name] sending invalid data ([N] invalid readings in last hour) — possible hardware failure. Last invalid value: [value] (valid range: [min]-[max])" |
| Workflows | WF-002 |
| Status | NOT IMPLEMENTED |

### NT-020: Health Check Failure

| Field | Value |
|---|---|
| Event | `/health` endpoint returns non-200 |
| Trigger | External monitoring service (Pingdom / Better Uptime) |
| Recipients | Astrea engineering team (external — not in-app) |
| Channels | External (webhook from monitoring service → Slack/PagerDuty) |
| Timing | Per monitoring service config (typically 1-5 min intervals) |
| Content | "Health check failed: [component] — DB: [ok/fail], Redis: [ok/fail], Queue: [depth], Last MQTT: [timestamp]" |
| Workflows | WF-023 |
| Status | NOT IMPLEMENTED |

---

## 5. Validation Catalog — Phase 10 (VL-011 → VL-018)

### VL-011: Corrective Action

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| alert_id | FK | ✅ | exists:alerts,id; alert must have severity critical or high | Invalid alert |
| action_taken | text | ✅ | max:2000, min:10 | Describe the corrective action taken (min 10 characters) |
| notes | text | ❌ | max:1000, nullable | — |

**System-managed:** taken_by (auth user), taken_at (now), verified_by (nullable), verified_at (nullable), status (logged/verified).

### VL-012: Maintenance Window

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| site_id | FK | ✅ | exists:sites,id, user must have site access | Invalid site |
| zone | string | ❌ | max:255, nullable (null = entire site) | — |
| title | string | ✅ | max:255 | Required |
| recurrence_rule | string | ✅ | valid RRULE or `once` | Invalid recurrence |
| start_time | time | ✅ | format:H:i | Invalid time format |
| duration_minutes | integer | ✅ | min:15, max:480 (8 hours) | Duration must be 15-480 minutes |
| suppress_alerts | boolean | ✅ | default:true | — |

**Cross-Field Rules:**

| Rule | Fields | Condition |
|---|---|---|
| No overlapping windows | site_id, zone, start_time, duration_minutes | Cannot overlap with existing window for same site+zone |

### VL-013: Report Schedule

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| site_id | FK | ❌ | exists:sites,id, nullable (null = org-wide) | Invalid site |
| type | enum | ✅ | in:temperature_compliance,energy_summary,alert_summary,executive_overview | Invalid report type |
| frequency | enum | ✅ | in:daily,weekly,monthly | Invalid frequency |
| day_of_week | integer | Required if weekly | 0-6 (Sunday=0) | Invalid day |
| time | time | ✅ | format:H:i | Invalid time |
| recipients_json | JSON | ✅ | array of valid email addresses, min:1, max:10 | At least one recipient required |
| active | boolean | ❌ | default:true | — |

### VL-014: Site Template

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| name | string | ✅ | max:255, unique per org | Template name already exists |
| description | text | ❌ | max:1000, nullable | — |
| modules | JSON | ✅ | array of valid module slugs | Invalid modules |
| zone_config | JSON | ❌ | array of {name, type}, nullable | Invalid zone config |
| recipe_assignments | JSON | ❌ | array of {zone, recipe_id}, each recipe_id exists:recipes,id, nullable | Invalid recipe |
| escalation_structure | JSON | ❌ | valid escalation chain structure (levels array), nullable | Invalid escalation structure |

### VL-015: Data Export Request

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| format | enum | ❌ | in:zip (only ZIP supported currently), default:zip | Invalid format |
| date_from | date | ❌ | format:Y-m-d, before:date_to, nullable (default: org created_at) | Invalid date |
| date_to | date | ❌ | format:Y-m-d, after:date_from, nullable (default: today) | Invalid date |

**Cross-Field Rules:**

| Rule | Fields | Condition |
|---|---|---|
| Rate limit | org_id | Max 1 active export per org at a time |
| Date range cap | date_from, date_to | Max 24 months of data per export |

### VL-016: Device Replacement

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| new_dev_eui | string | ✅ | max:16, unique across all devices, different from current | DevEUI already registered |
| new_app_key | string | ✅ | max:32 | Required for OTAA provisioning |
| new_model | string | ❌ | in:EM300-TH,CT101,WS301,AM307,VS121,EM300-MCS,WS202, nullable (defaults to old device model) | Invalid sensor model |

**Cross-Field Rules:**

| Rule | Fields | Condition |
|---|---|---|
| Old device must be active or offline | old device status | Cannot replace a device that is `pending` or already `replaced` |
| Model compatibility | new_model, old device recipe | If new_model differs, recipe compatibility checked (sensor_model match) |

### VL-017: Outage Declaration

| Field | Type | Required | Rules | Error Message |
|---|---|---|---|---|
| reason | text | ✅ | max:500, min:5 | Describe the outage reason |
| affected_services | JSON | ✅ | array of strings in:chirpstack,twilio,mqtt,redis,database,other | Select affected services |

### VL-018: Sensor Valid Ranges (Configuration)

| Model | Metric | Min | Max | Unit |
|---|---|---|---|---|
| EM300-TH | temperature | -40 | 85 | °C |
| EM300-TH | humidity | 0 | 100 | % |
| EM300-MCS | temperature | -40 | 85 | °C |
| CT101 | current | 0 | 100 | A |
| WS301 | door_status | 0 | 1 | binary |
| AM307 | co2 | 0 | 5000 | ppm |
| AM307 | pm2_5 | 0 | 1000 | μg/m³ |
| AM307 | humidity | 0 | 100 | % |
| AM307 | temperature | -20 | 60 | °C |
| VS121 | people_count | 0 | 500 | count |
| WS202 | temperature | -40 | 85 | °C |

**Enforcement:** `SanityCheckService::VALID_RANGES` constant (or config file). Applied in `ProcessSensorReading` BEFORE `ReadingStorageService::store()`.

---

## 6. Integration Map — Phase 10 (INT-009)

| ID | Service | Purpose | Direction | Auth | Failure Mode | Timeout | Workflows |
|---|---|---|---|---|---|---|---|
| INT-009 | Uptime Monitoring (Pingdom / Better Uptime / UptimeRobot) | Platform health monitoring via `/health` endpoint | Inbound (polling) | None (public endpoint) or API key | External service alerts Astrea team via Slack/PagerDuty | N/A (external polls us) | WF-023 |

### INT-009 Details

| Field | Value |
|---|---|
| Endpoint | `GET /health` (public, no auth required) |
| Response format | JSON: `{status: "ok"/"degraded"/"down", checks: {db: bool, redis: bool, queue_depth: int, last_mqtt_reading_at: iso8601, horizon: string}}` |
| HTTP status | 200 if all checks pass, 503 if any critical check fails |
| Rate limit | No rate limit (monitoring services poll every 1-5 minutes) |
| Sandbox | Same endpoint in all environments |

---

## Cross-Reference Index — Phase 10 Workflows

### Phase 10 Workflow → Spec Mapping

| Workflow | Business Rules | State Machines | Permissions | Notifications |
|---|---|---|---|---|
| WF-013 Corrective Action | BR-055, BR-056, BR-057, BR-058 | SM-011 (CorrectiveAction) | PM-004: log/verify corrective actions | NT-012 (Reminder) |
| WF-014 Device Replacement | BR-059, BR-060, BR-061, BR-062, BR-063 | SM-004 ext (replaced state) | PM-004: replace device (`manage devices`) | — |
| WF-015 Data Export & Offboarding | BR-064, BR-065, BR-066, BR-085 | SM-012 (DataExport) | PM-004: export org data | NT-013 (Export Ready) |
| WF-016 Alert Analytics & Tuning | BR-067, BR-068 | — | PM-004: view alert analytics | — |
| WF-017 Scheduled Report Delivery | BR-069, BR-070, BR-071, BR-072 | — | PM-004: manage report schedules | NT-014 (Report Delivery) |
| WF-018 Maintenance Windows | BR-073, BR-074, BR-075, BR-076 | — | PM-004: manage maintenance windows | — |
| WF-019 Mass Offline Detection | BR-077, BR-078, BR-079 | SM-004 (Device), SM-009 (Gateway) | — (system) | NT-017 (Mass Offline) |
| WF-020 Upstream Outage Declaration | BR-080, BR-081, BR-082 | SM-013 (Outage) | PM-004: access command center | NT-015 (Declared), NT-016 (Resolved) |
| WF-021 LFPDPPP Consent | BR-083, BR-084, BR-085 | — | — (all users) | — |
| WF-022 Site Template Cloning | BR-089, BR-090, BR-091 | — | PM-004: manage/use site templates | — |
| WF-023 Health Check | BR-092, BR-093 | — | PM-004: access command center | NT-020 (External) |
| WF-024 Alert Delivery Monitoring | BR-094, BR-095 | SM-010 (Notification) | PM-004: access command center | — |
| WF-025 Zero Readings Detection | BR-097, BR-098 | — | — (system) | NT-018 (Platform Alert) |
| WF-026 Dashboard Action Cards | BR-099, BR-100 | — | — (role-gated per BR-100) | — |

### Phase 10 Rules Modifying Existing Workflows

| Existing Workflow | Phase 10 Rules Added | Impact |
|---|---|---|
| WF-002 Sensor Data Pipeline | BR-086, BR-087, BR-088, BR-096 | Sanity checks + dedup BEFORE storage |
| WF-001 Client Onboarding | BR-072, BR-090, BR-091 | Default report schedule + template support |
| WF-003 Alert Lifecycle | BR-073, BR-076, BR-077, BR-080 | Alert suppression during maintenance/outage/mass-offline |
| WF-004 Device Health | BR-077, BR-078, BR-079 | Mass offline grouping replaces individual alerts |
| WF-006 Morning Summaries | BR-058 | Include corrective actions in compliance reports |

### Phase 10 ID Summary

| Category | New IDs | Range | Count |
|---|---|---|---|
| Business Rules | BR-055 → BR-100 | 46 new rules | 46 |
| State Machines | SM-011 → SM-013 + SM-004 ext | 3 new + 1 extension | 4 |
| Permission Matrix | PM-004 | 1 new matrix, 7 new permissions | 7 perms |
| Notifications | NT-012 → NT-020 | 9 new notifications | 9 |
| Validations | VL-011 → VL-018 | 8 new schemas | 8 |
| Integrations | INT-009 | 1 new integration | 1 |
| Workflows | WF-013 → WF-026 | 14 new workflows | 14 |
| **Total new IDs** | | | **89** |

---

## Phase 11: Operational Excellence — System Behavior Spec

> Added: 2026-03-23 (Phase 5 — pre-build definition)
> Scope: P0 + P1 priority features from Phase 4b stress test

---

## 1. Business Rules — Phase 11 (BR-101 → BR-130)

### Feature: Alert Snooze & Quiet Hours (P0 — Anti-Churn)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-101 | Each user can set quiet hours (start_time, end_time, timezone). During quiet hours, LOW and MEDIUM alerts are suppressed (queued). CRITICAL and HIGH alerts are always delivered immediately. | Communication | HIGH | WF-003, WF-024 | `AlertRouter::shouldSuppress($user)` | NOT BUILT |
| BR-102 | Snoozed alerts: user clicks "Snooze 2h" on alert detail → alert notifications suppressed for that user for that alert for 2 hours. After snooze expires, if alert still active, re-notify. | Communication | MEDIUM | WF-003 | `Alert::snooze($userId, $duration)` | NOT BUILT |
| BR-103 | Quiet hours are per-USER (not per-site). Stored in `users` table (quiet_hours_start, quiet_hours_end, quiet_hours_tz). | Configuration | MEDIUM | WF-009 | User model fields | NOT BUILT |
| BR-104 | Escalation chain overrides quiet hours: if user is in an escalation chain AND the alert has reached their level, deliver regardless of quiet hours. | Communication | CRITICAL | WF-024 | `EscalationService::escalate()` checks | NOT BUILT |
| BR-105 | Snoozed alerts still appear in alert list (status unchanged). Only notification delivery is suppressed. | Operational | MEDIUM | WF-003 | Alert list query unchanged | NOT BUILT |

### Feature: Bulk Operations (P0 — Anti-Churn)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-106 | Alerts Index: users can select multiple alerts via checkbox → batch acknowledge OR batch resolve. Maximum 100 alerts per batch. | Operational | HIGH | WF-003 | `AlertController::bulkAcknowledge()`, `bulkResolve()` | NOT BUILT |
| BR-107 | Work Orders Index: users can select multiple WOs via checkbox → batch assign to a technician. Maximum 50 WOs per batch. | Operational | HIGH | WF-004 | `WorkOrderController::bulkAssign()` | NOT BUILT |
| BR-108 | Bulk actions respect the same permission checks as individual actions. If user cannot acknowledge one alert in the batch, that alert is skipped and reported in the response. | Access | CRITICAL | WF-003, WF-004 | Policy checks per item | NOT BUILT |
| BR-109 | Bulk actions are atomic per-item, not transactional. If 10 of 15 alerts can be acknowledged, acknowledge the 10 and report 5 failures. | Operational | MEDIUM | WF-003, WF-004 | Loop with try/catch per item | NOT BUILT |
| BR-110 | UI shows floating action bar at bottom when 1+ items selected. Bar shows count + available actions. Disappears when selection cleared. | UX | MEDIUM | WF-003, WF-004 | Frontend component | NOT BUILT |

### Feature: Notification Preferences (P0 — Anti-Churn)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-111 | Each user has per-channel notification preferences: whatsapp (on/off), push (on/off), email (on/off). Defaults: all on. | Communication | HIGH | WF-024 | `User` model fields + `AlertRouter::getChannels($user)` | NOT BUILT |
| BR-112 | Per-severity filter: user can set minimum severity for notifications (e.g., "only CRITICAL and HIGH"). Alerts below threshold are suppressed for that user. | Communication | MEDIUM | WF-024 | `AlertRouter::shouldNotify($user, $alert)` | NOT BUILT |
| BR-113 | Escalation chain overrides notification preferences: if user is in a chain and alert reaches their level, all enabled channels fire regardless of severity filter. | Communication | CRITICAL | WF-024 | `EscalationService` bypass check | NOT BUILT |
| BR-114 | Settings page section "My Notifications" shows per-channel toggles + severity filter. Changes take effect immediately (no restart/refresh needed). | UX | LOW | WF-009 | Settings page + User model update | NOT BUILT |

### Feature: Site Comparison & Ranking (P1 — Operational Value)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-115 | New page `/sites/compare` accessible to site_manager and org_admin. Shows ranking table of accessible sites by selected metric. | Operational | MEDIUM | WF-NEW | `SiteComparisonController` | NOT BUILT |
| BR-116 | Ranking metrics: compliance % (alerts resolved / total), alert count (period), average response time (alert → ack), device uptime %, energy cost. Default sort: compliance % descending. | Analytics | MEDIUM | WF-NEW | `SiteComparisonService::rank()` | NOT BUILT |
| BR-117 | Side-by-side comparison: user selects 2-5 sites → overlay charts for chosen metric over time (30/90/365 days). | Analytics | LOW | WF-NEW | Frontend chart component | NOT BUILT |
| BR-118 | Export ranking as PDF for regional meetings. Includes: date range, metric, all sites with values, org branding. | Reporting | LOW | WF-NEW | `PdfService::generateComparison()` | NOT BUILT |

### Feature: SLA & KPI Dashboard (P1 — Operational Value)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-119 | New page `/analytics/performance` accessible to org_admin. Shows KPIs: avg alert response time (target <15 min), alerts resolved within SLA %, device uptime %, sensor coverage %, compliance score per site. | Analytics | MEDIUM | WF-NEW | `PerformanceAnalyticsController` | NOT BUILT |
| BR-120 | Trend over 30/90/365 days for each KPI. Shows improvement or degradation with directional indicator. | Analytics | LOW | WF-NEW | `PerformanceAnalyticsService::getTrend()` | NOT BUILT |
| BR-121 | Export as "ROI Report" PDF — org_admin shows to their board to justify IoT investment. Includes: KPIs, trends, cost savings estimate (based on alerts prevented × avg incident cost). | Reporting | MEDIUM | WF-NEW | `PdfService::generateROIReport()` | NOT BUILT |

### Feature: User Deactivation & Transfer (P1 — Operational Value)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-122 | Deactivate user (not delete): block login, keep all audit trail records. New field: `deactivated_at` (nullable timestamp). User with `deactivated_at` set cannot authenticate. | Access | CRITICAL | WF-009 | Auth middleware + User model | NOT BUILT |
| BR-123 | On deactivation: auto-reassign open work orders to the user's site_manager (or mark unassigned). Escalation chains: remove user from all levels, notify org_admin of gaps. | Operational | HIGH | WF-009 | `UserDeactivationService::deactivate()` | NOT BUILT |
| BR-124 | Activity log records: "User X deactivated by Y, Z work orders reassigned to W". | Compliance | HIGH | WF-009 | `LogsActivity` on User model | NOT BUILT |
| BR-125 | Deactivated users are excluded from: user lists, escalation chain dropdowns, work order assignment dropdowns. But their historical records (WOs, CAs, activity log) remain visible. | Operational | MEDIUM | WF-009 | Scopes on User model | NOT BUILT |
| BR-126 | Reactivation: org_admin can reactivate a deactivated user. Clears `deactivated_at`. Does NOT auto-restore escalation chain membership — must be manually re-added. | Access | MEDIUM | WF-009 | `UserManagementController::reactivate()` | NOT BUILT |

### Feature: Site Event Timeline (P1 — Operational Value)

| ID | Rule | Category | Severity | Workflows | Enforced In | Status |
|---|---|---|---|---|---|---|
| BR-127 | New page `/sites/{id}/timeline` accessible to org_admin, site_manager. Shows unified chronological view of ALL events for a site within a date range. | Operational | MEDIUM | WF-NEW | `SiteTimelineController` | NOT BUILT |
| BR-128 | Event types included: sensor readings (key metrics only — hourly aggregates, not raw), alerts (triggered/ack'd/resolved), work orders (created/completed), activity log entries (config changes), corrective actions. | Operational | MEDIUM | WF-NEW | `SiteTimelineService::getEvents()` | NOT BUILT |
| BR-129 | Filterable by: date range (default last 7 days), event type, zone, device. | UX | LOW | WF-NEW | Query params | NOT BUILT |
| BR-130 | Performance: timeline queries must return in <2 seconds for 7-day range on a site with 30 sensors. Use aggregated readings (1h buckets), not raw. | Quality | HIGH | WF-NEW | ReadingQueryService auto-resolution | NOT BUILT |

---

## 2. State Machines — Phase 11 (SM-014 → SM-015)

### SM-014: User Account Lifecycle

```
  ┌──────────┐
  │  active   │◄──── reactivate (org_admin)
  └────┬─────┘
       │ deactivate (org_admin)
  ┌────▼─────┐
  │ deactivated │
  └──────────┘
```

| From | To | Trigger | Actor | Guard | Side Effects |
|---|---|---|---|---|---|
| active | deactivated | Deactivate user | org_admin | Cannot deactivate self; cannot deactivate last org_admin | Reassign WOs (BR-123), remove from escalation chains, log activity (BR-124) |
| deactivated | active | Reactivate user | org_admin | — | Clears deactivated_at, logs activity. Does NOT restore escalation chain membership. |

### SM-015: Alert Snooze (per-user overlay, not entity state)

```
  ┌───────────────┐
  │ not_snoozed   │ (default)
  └───────┬───────┘
          │ snooze(userId, duration)
  ┌───────▼───────┐
  │   snoozed     │ (notifications suppressed for this user)
  └───────┬───────┘
          │ duration expires OR user un-snoozes
  ┌───────▼───────┐
  │ not_snoozed   │ (re-notify if alert still active)
  └───────────────┘
```

Note: Snooze is stored per (alert_id, user_id) — not a state on the Alert model. Implemented via `alert_snoozes` table or Redis key with TTL.

---

## 3. Permission Matrix — Phase 11 (PM-005)

### PM-005: Phase 11 Permission Updates

| Action | Entity | super_admin | org_admin | site_manager | site_viewer | technician |
|---|---|---|---|---|---|---|
| Bulk acknowledge | Alert | ✅ | ✅ own org | ✅ own sites | ✅ own site | ✅ own sites |
| Bulk resolve | Alert | ✅ | ✅ own org | ✅ own sites | ❌ | ❌ |
| Bulk assign WOs | WorkOrder | ✅ | ✅ own org | ✅ own sites | ❌ | ❌ |
| Snooze alert | Alert | ✅ | ✅ | ✅ | ✅ | ✅ |
| Set quiet hours | User (self) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Set notification prefs | User (self) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View site comparison | Site | ✅ | ✅ own org | ✅ own sites | ❌ | ❌ |
| View SLA dashboard | Analytics | ✅ | ✅ own org | ❌ | ❌ | ❌ |
| View site timeline | Site | ✅ | ✅ own org | ✅ own sites | ❌ | ❌ |
| Deactivate user | User | ✅ | ✅ own org | ❌ | ❌ | ❌ |
| Reactivate user | User | ✅ | ✅ own org | ❌ | ❌ | ❌ |
| Export ROI report | Analytics | ✅ | ✅ own org | ❌ | ❌ | ❌ |

### New Permissions Required

| Permission | Used By | Entity |
|---|---|---|
| `view site comparison` | site_manager, org_admin | Sites |
| `view performance analytics` | org_admin | Analytics |
| `deactivate users` | org_admin | Users |

---

## 4. Notification & Communication Map — Phase 11 (NT-021 → NT-025)

### NT-021: Quiet Hours Summary

| Field | Value |
|---|---|
| **Trigger** | End of quiet hours period |
| **Recipients** | The user whose quiet hours just ended |
| **Channel** | Push only |
| **Content** | "You had {N} alerts during quiet hours. {critical_count} critical, {high_count} high." With link to filtered alert list. |
| **Suppressible** | No (this IS the catch-up notification) |

### NT-022: User Deactivation Notice

| Field | Value |
|---|---|
| **Trigger** | User deactivated by org_admin |
| **Recipients** | org_admin (confirmation), affected escalation chain members (gap warning) |
| **Channel** | In-app + email to org_admin |
| **Content** | "User {name} deactivated. {N} work orders reassigned. {M} escalation chain gaps created — review chains." |

### NT-023: Work Order Reassignment (Bulk)

| Field | Value |
|---|---|
| **Trigger** | Bulk assign work orders to technician |
| **Recipients** | Assigned technician |
| **Channel** | Push + in-app |
| **Content** | "You have been assigned {N} new work orders by {assigner}." |

### NT-024: Snooze Expiry Re-notification

| Field | Value |
|---|---|
| **Trigger** | Alert snooze expires AND alert still active |
| **Recipients** | User who snoozed |
| **Channel** | Same channels as original alert |
| **Content** | Original alert content + "Snoozed alert still active — requires attention." |

### NT-025: SLA Threshold Breach

| Field | Value |
|---|---|
| **Trigger** | Average response time exceeds 15 min threshold over 7-day rolling window |
| **Recipients** | org_admin |
| **Channel** | Email (weekly digest) |
| **Content** | "Alert response time SLA breached: avg {X} min (target: <15 min). Top 5 slowest sites: ..." |

---

## 5. Validation Catalog — Phase 11 (VL-016 → VL-019)

### VL-016: Alert Snooze

| Field | Type | Required | Rules |
|---|---|---|---|
| alert_id | FK | ✅ | Must exist, user must have access |
| duration_minutes | integer | ✅ | In [30, 60, 120, 240, 480]. Default: 120 |

### VL-017: Quiet Hours

| Field | Type | Required | Rules |
|---|---|---|---|
| quiet_hours_start | time (H:i) | ❌ | Valid time format |
| quiet_hours_end | time (H:i) | ❌ | Valid time format; must be different from start |
| quiet_hours_tz | string | ❌ | Valid timezone identifier |

### VL-018: Notification Preferences

| Field | Type | Required | Rules |
|---|---|---|---|
| notify_whatsapp | boolean | ❌ | Default: true |
| notify_push | boolean | ❌ | Default: true |
| notify_email | boolean | ❌ | Default: true |
| notify_min_severity | enum | ❌ | In [low, medium, high, critical]. Default: low (all) |

### VL-019: Bulk Operations

| Field | Type | Required | Rules |
|---|---|---|---|
| ids | array | ✅ | Min: 1, max: 100 (alerts) or 50 (WOs). Each ID must exist. |
| action | string | ✅ | In [acknowledge, resolve, assign] |
| assigned_to | FK | Conditional | Required if action=assign. Must be a technician in the org. |

---

## 6. Phase 11 Workflow Cross-Reference

| Workflow | New Business Rules | New State Machines | New Permissions | New Notifications |
|---|---|---|---|---|
| WF-003 (Alert Lifecycle) ext | BR-101, BR-102, BR-104, BR-105, BR-106, BR-108, BR-109 | SM-015 (Snooze) | Bulk acknowledge | NT-024 (Snooze expiry) |
| WF-004 (Work Order) ext | BR-107, BR-108, BR-109 | — | Bulk assign WOs | NT-023 (Bulk reassignment) |
| WF-009 (User Mgmt) ext | BR-111–BR-114, BR-122–BR-126 | SM-014 (User lifecycle) | deactivate users | NT-021 (Quiet summary), NT-022 (Deactivation) |
| WF-024 (Escalation) ext | BR-104, BR-113 | — | — | — (escalation override rules) |
| WF-NEW: Site Comparison | BR-115–BR-118 | — | view site comparison | — |
| WF-NEW: SLA Dashboard | BR-119–BR-121 | — | view performance analytics | NT-025 (SLA breach) |
| WF-NEW: Site Timeline | BR-127–BR-130 | — | — (reuses site access) | — |

### Phase 11 ID Summary

| Category | New IDs | Range | Count |
|---|---|---|---|
| Business Rules | BR-101 → BR-130 | 30 new rules | 30 |
| State Machines | SM-014 → SM-015 | 2 new state machines | 2 |
| Permission Matrix | PM-005 | 3 new permissions | 3 |
| Notifications | NT-021 → NT-025 | 5 new notifications | 5 |
| Validations | VL-016 → VL-019 | 4 new schemas | 4 |
| Integrations | — | No new integrations | 0 |
| **Total new IDs** | | | **44** |
