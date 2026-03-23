---
generated_by: playbook-phase-4c
last_updated: 2026-03-23
source_commit: 9888be7
total_workflows: 30
---

# Workflow Catalog — Astrea IoT Platform

> Canonical list of all business workflows. Every other playbook phase references this file.
> Cross-referenced via 5-lens extraction: Role, Entity, Route, Event, Money.

## Summary

- **Total workflows:** 30
- **Built & tested:** 22
- **Built (partial):** 5
- **Not started (Phase 11+):** 3
- **Categories:** Onboarding (3), Data Pipeline (3), Alerts (5), Operations (4), Compliance (3), Financial (5), Configuration (4), Analytics (3)

### Lifecycle Legend

| Status | Meaning |
|---|---|
| `tested` | Code complete + automated tests exist |
| `built` | Code complete, tests partial or missing |
| `partial` | Some steps implemented, gaps remain |
| `extracted` | Workflow defined, not yet built |
| `deprecated` | Removed or replaced — ID preserved |

---

## Catalog

| WF-ID | Workflow | Category | Trigger | Primary Actor | Entities | Depends On | PRD Phase | Lifecycle | Lenses |
|---|---|---|---|---|---|---|---|---|---|
| WF-001 | Client Onboarding | Onboarding | super_admin creates org | super_admin | Organization, BillingProfile, Subscription | — | 0 | tested | R E Rt Ev M |
| WF-002 | Sensor Data Pipeline | Data Pipeline | MQTT uplink | System | SensorReading, Device | — | 1 | tested | R E Rt Ev |
| WF-003 | Alert Lifecycle | Alerts | Rule breach | System → site_manager | Alert, AlertRule | WF-002 | 2 | tested | R E Rt Ev |
| WF-004 | Work Order Lifecycle | Operations | Alert/health check/manual | site_manager, technician | WorkOrder, WorkOrderPhoto, WorkOrderNote | WF-003 | 6 | tested | R E Rt Ev |
| WF-005 | Morning Summaries | Communication | Cron (per-timezone) | System | Site, Device, Alert | WF-002, WF-003 | 3 | tested | E Ev |
| WF-006 | Report Generation | Compliance | User action | site_viewer+ | SensorReading, Alert | WF-002 | 3 | tested | R Rt |
| WF-007 | Billing & Invoicing | Financial | Monthly cron / manual | System, org_admin | Subscription, SubscriptionItem, Invoice, BillingProfile | WF-001 | 7 | tested | R E Rt Ev M |
| WF-008 | Compliance Calendar | Compliance | Manual creation | org_admin | ComplianceEvent | — | 5 | built | R E Rt |
| WF-009 | User Management | Configuration | org_admin action | org_admin | User | WF-001 | 0 | tested | R E Rt |
| WF-010 | Integration Export | Configuration | Manual/scheduled | org_admin | IntegrationConfig | WF-007 | 9 | built | R E Rt |
| WF-011 | Module System | Configuration | org_admin toggle | org_admin | Module, SiteModule, Recipe | WF-001 | 4 | tested | R E Rt |
| WF-012 | White-Label Branding | Configuration | org_admin saves | org_admin | Organization | WF-001 | 9 | built | R E |
| WF-013 | Corrective Action | Compliance | User logs action on alert | site_manager, technician | CorrectiveAction, Alert | WF-003 | 10 | tested | R E Rt |
| WF-014 | Device Replacement | Operations | site_manager initiates | site_manager | Device, AlertRule | WF-002 | 10 | tested | R E Rt |
| WF-015 | Data Export & Offboarding | Operations | org_admin requests | org_admin | DataExport | WF-001 | 10 | built | R E Rt Ev |
| WF-016 | Maintenance Window Mgmt | Operations | site_manager creates | site_manager | MaintenanceWindow | WF-003 | 10 | tested | R E Rt |
| WF-017 | Outage Declaration | Alerts | super_admin declares | super_admin | OutageDeclaration | WF-003 | 10 | tested | R E Rt |
| WF-018 | Site Template Cloning | Onboarding | site_manager captures | site_manager | SiteTemplate, Site | WF-001 | 10 | built | R E Rt |
| WF-019 | Alert Analytics | Analytics | User navigates | org_admin, site_manager | Alert, AlertRule | WF-003 | 10 | tested | R Rt |
| WF-020 | Sanity Check Pipeline | Data Pipeline | Each sensor reading | System | DeviceAnomaly, Device | WF-002 | 10 | tested | E Ev |
| WF-021 | Mass Offline Detection | Alerts | Device health check | System | Alert, Device, Gateway | WF-002 | 10 | tested | E Ev |
| WF-022 | Scheduled Report Delivery | Communication | Cron (daily) | System, org_admin | ReportSchedule | WF-006 | 10 | built | R E Rt Ev |
| WF-023 | Site Onboarding Wizard | Onboarding | org_admin starts wizard | org_admin | Site, Gateway, Device, FloorPlan | WF-001 | 1 | tested | R E Rt |
| WF-024 | Alert Escalation Chain | Alerts | Alert triggered | System | EscalationChain, AlertNotification | WF-003 | 2 | tested | R E Ev |
| WF-025 | Device Health Monitoring | Data Pipeline | Cron (every 5 min) | System | Device, Gateway | WF-002 | 1 | tested | E Ev |
| WF-026 | Platform Outage Detection | Alerts | Cron (every 5 min) | System | OutageDeclaration | WF-002 | 10 | tested | E Ev |
| WF-027 | Defrost Pattern Learning | Data Pipeline | Per-device (hour 49) | System | DefrostSchedule, Device | WF-002 | 4 | tested | E Ev |
| WF-028 | Compliance Reminders | Compliance | Cron (daily 07:00) | System | ComplianceEvent | WF-008 | 5 | built | E Ev |
| WF-029 | Invoice CFDI Cancellation | Financial | org_admin action | org_admin | Invoice | WF-007 | 11 | extracted | E M |
| WF-030 | Payment Complement (CdP) | Financial | Payment received | System | Invoice | WF-007 | 11 | extracted | M |

---

## PRD Traceability Matrix

### Phase 0-7: Foundation → Billing (ALL BUILT)

| PRD Requirement | Description | Workflow(s) | Rules | Screen(s) | Status |
|---|---|---|---|---|---|
| P0: Foundation | Laravel setup, auth, multi-tenancy, recipes | WF-001, WF-009, WF-011 | BR-029-033 | Auth pages, Settings | TRACED |
| P1: Data Pipeline | MQTT, provisioning, onboarding wizard | WF-002, WF-023, WF-025 | BR-001-009 | Dashboard, Site Detail | TRACED |
| P2: Alert Engine | Rules, escalation, WhatsApp | WF-003, WF-024 | BR-010-020 | Alert pages, Rules | TRACED |
| P3: Dashboards + Summaries | Client dashboard, morning summaries | WF-005, WF-006 | BR-034-037 | Dashboard, Reports | TRACED |
| P4: Cold Chain | Modules, defrost detection, HACCP | WF-011, WF-027 | BR-040-046 | Module pages, Recipes | TRACED |
| P5: Energy + Compliance | Energy reports, compliance calendar | WF-006, WF-008, WF-028 | BR-021-028, BR-038-039 | Reports, Compliance | TRACED |
| P6: CC + Work Orders | Command center, work order system | WF-004, WF-017 | BR-047-050 | CC pages, Work Orders | TRACED |
| P7: Billing + Polish | Subscriptions, invoicing, CFDI | WF-007 | BR-021-028 | Billing pages | TRACED |

### Phase 8: Mobile App (SEPARATE REPO)

| PRD Requirement | Description | Workflow(s) | Status |
|---|---|---|---|
| P8: Mobile App | Expo app with Sanctum API | WF-002, WF-003, WF-004 (via API) | TRACED (iot-expo repo) |

### Phase 9: Advanced (PARTIAL)

| PRD Requirement | Description | Workflow(s) | Status |
|---|---|---|---|
| Door pattern intelligence | Door frequency + duration | WF-025 | TRACED (built) |
| Compressor duty cycle | CT101 degradation | WF-025 | TRACED (built) |
| Industrial module | Vibration, compressed air | WF-011 | PARTIAL (page exists, limited) |
| IAQ/HVAC module | CO2, occupancy vs HVAC | WF-011 | PARTIAL (page exists, limited) |
| People & Flow | Occupancy heatmap, traffic | — | NOT TRACED (no page) |
| Partner portal | White-label management | WF-012 | TRACED (built) |

### Phase 10: Operational Completeness (ALL BUILT)

| PRD Requirement | Workflow(s) | Rules | Screen(s) | Status |
|---|---|---|---|---|
| Corrective Action (WF-013) | WF-013 | BR-055, SM-011 | Alert Detail (inline) | TRACED |
| Device Replacement | WF-014 | BR-059-060 | Device page (action) | TRACED |
| Data Export | WF-015 | BR-064-066, SM-012 | Settings/Export Data | TRACED |
| Alert Analytics | WF-019 | BR-067-068 | Analytics/Alerts | TRACED |
| Scheduled Reports | WF-022 | BR-069-072 | Settings/Report Schedules | TRACED |
| Maintenance Windows | WF-016 | BR-073-075 | Settings/Maintenance Windows | TRACED |
| Mass Offline Detection | WF-021 | BR-076-078 | — (backend-only) | TRACED |
| Outage Declaration | WF-017 | BR-079-081, SM-013 | Command Center (actions) | TRACED |
| LFPDPPP Consent | WF-009 (extended) | BR-082-084 | Privacy/Accept | TRACED |
| Sanity Checks | WF-020 | BR-085-088 | — (backend-only) | TRACED |
| Site Templates | WF-018 | BR-089-091 | Settings/Site Templates | TRACED |
| Health Check Endpoint | WF-026 (extended) | BR-092-093 | — (API-only) | TRACED |
| Duplicate Reading Protection | WF-002 (extended) | BR-094-095 | — (migration) | TRACED |
| Platform Outage Detection | WF-026 | BR-096-098 | — (backend-only) | TRACED |
| Dashboard Action Cards | WF-002 (extended) | — | Dashboard | TRACED |
| Alert Delivery Monitoring | WF-024 (extended) | — | CC (partial) | PARTIAL |
| Mobile API for Phase 10 | WF-013, WF-014 (via API) | — | — (iot-expo) | NOT TRACED |

### Phase 11: Operational Excellence (NOT STARTED — 16 features)

| PRD Requirement | Description | Workflow | Rules | Screen | Status |
|---|---|---|---|---|---|
| Site Comparison & Ranking | `/sites/compare` page | — | — | — | NOT TRACED |
| Daily Temp Verification Checklist | Manual 3x/day checks | — | — | — | NOT TRACED |
| Alert Snooze & Quiet Hours | Per-user suppression | — | — | — | NOT TRACED |
| SLA & KPI Dashboard | `/analytics/performance` | — | — | — | NOT TRACED |
| User Deactivation & Transfer | Deactivate + reassign WOs | — | — | — | NOT TRACED |
| Notification Preferences | Per-user channel toggles | — | — | — | NOT TRACED |
| Device/Asset Inventory Report | New report type | — | — | — | NOT TRACED |
| Bulk Operations | Checkbox select + batch actions | — | — | — | NOT TRACED |
| Site Event Timeline | `/sites/{id}/timeline` | — | — | — | NOT TRACED |
| Maintenance Request Button | site_viewer "Request Help" | — | — | — | NOT TRACED |
| Post-Onboarding Checklist | Configuration progress banner | — | — | — | NOT TRACED |
| Invoice Cancellation + CFDI Cancel | WF-029 | — | — | — | NOT TRACED |
| Technician Floor Plan Access | Read-only floor plan | — | — | — | PARTIAL (already accessible) |
| Tech Workload View | WO count per technician | — | — | — | NOT TRACED |
| Subscription Plan Changes | Upgrade/downgrade flow | — | — | — | NOT TRACED |
| Org Suspend vs Archive | Two org states | — | — | — | NOT TRACED |
| Config Summary | "Your Setup" section | — | — | — | NOT TRACED |
| Payment Reminders & Dunning | Automated overdue emails | — | — | — | NOT TRACED |
| Platform Status Page | External status page | — | — | — | NOT TRACED |
| Complemento de Pago | WF-030 (CFDI payment complement) | — | — | — | NOT TRACED |

### Phase 12: Competitive Advantage (NOT STARTED — 8 features)

| PRD Requirement | Description | Status |
|---|---|---|
| NOM-072 Sensor Gap Detection | Pharmacy monitoring gaps >15min | NOT TRACED |
| Probe Calibration Management | Calibration records + certificates | NOT TRACED |
| Audit Mode | One-click compliance view | NOT TRACED |
| Cross-Site Comparison Report | PDF comparing N sites | NOT TRACED |
| Predictive Analytics | Battery/compressor/temp predictions | NOT TRACED |
| Batch Site Onboarding | CSV import for 50+ sites | NOT TRACED |
| Insurance Documentation Export | Claim evidence package | NOT TRACED |

### Phase 13: Platform & Scale (NOT STARTED — 7 features)

| PRD Requirement | Description | Status |
|---|---|---|
| Public REST API | Versioned with OpenAPI docs | NOT TRACED |
| Custom Webhook Subscriptions | Event-type filtering | NOT TRACED |
| Multi-Currency Support | MXN, USD, COP, BRL | NOT TRACED |
| Reseller / Partner Portal | White-label depth | NOT TRACED |
| Digital Signatures | e.firma on compliance docs | NOT TRACED |
| Anonymized Benchmark Data | Cross-client comparison | NOT TRACED |
| Custom Dashboard Builder | Drag-drop KPI views | NOT TRACED |

---

## 5-Lens Coverage Matrix

| WF-ID | Workflow | Role | Entity | Route | Event | Money |
|---|---|---|---|---|---|---|
| WF-001 | Client Onboarding | ✅ | ✅ | ✅ | ✅ | ✅ |
| WF-002 | Sensor Data Pipeline | ❌ | ✅ | ✅ | ✅ | ❌ |
| WF-003 | Alert Lifecycle | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-004 | Work Order Lifecycle | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-005 | Morning Summaries | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-006 | Report Generation | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-007 | Billing & Invoicing | ✅ | ✅ | ✅ | ✅ | ✅ |
| WF-008 | Compliance Calendar | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-009 | User Management | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-010 | Integration Export | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-011 | Module System | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-012 | White-Label Branding | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-013 | Corrective Action | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-014 | Device Replacement | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-015 | Data Export | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-016 | Maintenance Windows | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-017 | Outage Declaration | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-018 | Site Template Cloning | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-019 | Alert Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-020 | Sanity Check Pipeline | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-021 | Mass Offline Detection | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-022 | Scheduled Reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-023 | Site Onboarding Wizard | ✅ | ✅ | ✅ | ❌ | ❌ |
| WF-024 | Alert Escalation | ✅ | ✅ | ✅ | ✅ | ❌ |
| WF-025 | Device Health Monitor | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-026 | Platform Outage Detect | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-027 | Defrost Learning | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-028 | Compliance Reminders | ❌ | ✅ | ❌ | ✅ | ❌ |
| WF-029 | Invoice Cancellation | ❌ | ✅ | ❌ | ❌ | ✅ |
| WF-030 | Payment Complement | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## Financial Gap Summary (Money Lens)

### Fully Traced (7 transaction types)
1. Subscription base fee with discount
2. Device-based metering (per-sensor pricing)
3. Addon gateway surcharges ($2,500/month)
4. Monthly invoice generation (subtotal + 16% IVA)
5. CFDI timbrado (SAT electronic invoice)
6. Payment recording (method + timestamp)
7. Overdue auto-transition

### Missing (Phase 11+ — 4 transaction types)
1. **Invoice cancellation** (WF-029) — CFDI cancel via Facturapi
2. **Complemento de Pago** (WF-030) — Payment complement CFDI
3. **Subscription plan changes** — Upgrade/downgrade with proration
4. **Payment reminders & dunning** — 7/14/30 day overdue notifications

### Reporting Gaps (No dashboard or export)
- MRR dashboard, AR aging, payment collection rate, revenue by segment, churn analysis, SAT compliance export, cash flow forecast

---

*Generated by Playbook Phase 4c — 5-lens extraction. 30 workflows cataloged from 40 models, 197 routes, 17 jobs, 5 notifications, 29 permissions.*
