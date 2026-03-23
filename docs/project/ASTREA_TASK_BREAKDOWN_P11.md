# Astrea IoT Platform — Phase 11 Task Breakdown

> Generated: 2026-03-23 | Phase 6 Playbook Output
> Primary Input: SYSTEM_BEHAVIOR_SPEC.md (BR-101→BR-130), WORKFLOW_UX_DESIGN.md (Phase 11 screens)
> Secondary Input: IMPLEMENTATION_GAP_REPORT.md (3 MEDIUM coverage gaps, 5 PARTIAL items)
> Previous milestones: M1-M6 + Phase 10 complete | This plan covers Phase 11 (Operational Excellence)

---

## Roadmap Overview

```
Cycle 0: Tech Debt + Coverage Gaps           (P0)  ~1 day
Cycle 1: Alert Snooze & Quiet Hours          (P0)  ~3 days
Cycle 2: Bulk Operations                     (P0)  ~2 days
Cycle 3: Notification Preferences            (P0)  ~1 day
Cycle 4: User Deactivation & Transfer        (P1)  ~2 days
Cycle 5: Site Comparison & SLA Dashboard     (P1)  ~3 days
Cycle 6: Site Event Timeline                 (P1)  ~2 days
Cycle 7: Cross-Cutting Sweeps + Polish       (P2)  ~1 day
```

**Total estimated effort:** ~15 days (solo dev)
**Priority order:** P0 features first (anti-churn), then P1 (operational value), then P2 (polish)

---

## Dependency Graph

```
Cycle 0 (tech debt) ──────────────────────────────────────────┐
    │                                                          │
    ├── Cycle 1 (alert snooze) ──┐                             │
    │                             ├── Cycle 3 (notif prefs)    │
    ├── Cycle 2 (bulk ops) ──────┘                             │
    │                                                          │
    ├── Cycle 4 (user deactivation) ───────────────────────────┤
    │                                                          │
    ├── Cycle 5 (site compare + SLA) ──────────────────────────┤
    │                                                          │
    ├── Cycle 6 (site timeline) ───────────────────────────────┤
    │                                                          │
    └──────────────────────────────────────────────────────────▶ Cycle 7 (polish)
```

Cycles 1-6 are independent after Cycle 0. Cycle 3 benefits from Cycle 1 (quiet hours + notification prefs share the same settings section). Cycle 7 runs last.

---

## Cycle 0: Tech Debt + Coverage Gaps (~1 day)

> Close remaining gaps from Phase 4b before building new features.

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-001 | Write DataExport controller + job tests | TEST | P1 | Small | — | `tests/Feature/Http/DataExportTest.php` |
| P11-002 | Write ReportSchedule controller tests | TEST | P1 | Small | — | `tests/Feature/Http/ReportScheduleTest.php` |
| P11-003 | Write SiteTemplate controller tests + create SiteTemplatePolicy | TEST+BUILD | P1 | Small | — | `tests/Feature/Http/SiteTemplateTest.php`, `app/Policies/SiteTemplatePolicy.php` |
| P11-004 | Clean up 6 dead code items | FIX | P2 | Quick Win | — | Delete: NotificationSeeder, use-error-handler, use-search, useDebounce, HasRole.tsx, SiteSelector.tsx |
| P11-005 | Create PruneExpiredDataExports scheduled job | BUILD | P1 | Quick Win | BR-I4 | `app/Jobs/PruneExpiredDataExports.php`, `bootstrap/app.php` |

---

## Cycle 1: Alert Snooze & Quiet Hours (~3 days)

> **Anti-churn P0.** Prevents users from blocking WhatsApp → alerts stop working → churn.

### Backend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-010 | Add quiet hours fields to User model + migration | BUILD | P0 | Quick Win | BR-103 | `app/Models/User.php`, migration: `add_quiet_hours_to_users` |
| P11-011 | Create alert_snoozes table + model | BUILD | P0 | Small | BR-102, SM-015 | `app/Models/AlertSnooze.php`, migration, factory |
| P11-012 | Add snooze/unsnooze endpoints to AlertController | BUILD | P0 | Small | BR-102, BR-105 | `app/Http/Controllers/AlertController.php` |
| P11-013 | Modify AlertRouter to check quiet hours + snooze | ENHANCE | P0 | Medium | BR-101, BR-104 | `app/Services/Alerts/AlertRouter.php` |
| P11-014 | Create SnoozeExpiryCheck job (runs every minute) | BUILD | P0 | Small | BR-102, NT-024 | `app/Jobs/CheckExpiredSnoozes.php` |
| P11-015 | Write snooze + quiet hours tests | TEST | P0 | Medium | — | `tests/Feature/Http/AlertSnoozeTest.php`, `tests/Feature/Services/QuietHoursTest.php` |

### Frontend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-016 | Add Snooze button to Alert Detail page | BUILD | P0 | Small | BR-102 | `resources/js/pages/alerts/show.tsx` |
| P11-017 | Add Quiet Hours section to Profile Settings | BUILD | P0 | Small | BR-103, VL-017 | `resources/js/pages/settings/profile.tsx` |
| P11-018 | Add snooze indicator badge on alert header | BUILD | P0 | Quick Win | BR-105 | `resources/js/pages/alerts/show.tsx` |

---

## Cycle 2: Bulk Operations (~2 days)

> **Anti-churn P0.** After power restoration, 15 alerts need ack — user shouldn't click 15 times.

### Backend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-020 | Add bulkAcknowledge + bulkResolve endpoints | BUILD | P0 | Small | BR-106, BR-108, BR-109 | `app/Http/Controllers/AlertController.php` |
| P11-021 | Add bulkAssign endpoint for work orders | BUILD | P0 | Small | BR-107, BR-108, BR-109 | `app/Http/Controllers/WorkOrderController.php` |
| P11-022 | Write bulk operation tests (permission per-item, partial success) | TEST | P0 | Medium | BR-108, BR-109 | `tests/Feature/Http/BulkOperationsTest.php` |

### Frontend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-023 | Add checkbox selection + floating action bar to Alerts Index | BUILD | P0 | Medium | BR-110 | `resources/js/pages/alerts/index.tsx` |
| P11-024 | Add checkbox selection + floating action bar to Work Orders Index | BUILD | P0 | Medium | BR-110 | `resources/js/pages/work-orders/index.tsx` |
| P11-025 | Create reusable BulkActionBar component | BUILD | P0 | Small | BR-110 | `resources/js/components/ui/bulk-action-bar.tsx` |

---

## Cycle 3: Notification Preferences (~1 day)

> **Anti-churn P0.** Users who prefer push-only still get WhatsApp → annoyance → churn.

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-030 | Add notification preference fields to User model + migration | BUILD | P0 | Quick Win | BR-111, VL-018 | `app/Models/User.php`, migration |
| P11-031 | Modify AlertRouter to respect user channel preferences + severity filter | ENHANCE | P0 | Small | BR-112, BR-113 | `app/Services/Alerts/AlertRouter.php` |
| P11-032 | Add Notification Preferences section to Profile Settings | BUILD | P0 | Small | BR-114, VL-018 | `resources/js/pages/settings/profile.tsx` |
| P11-033 | Write notification preference tests (channel suppression, escalation override) | TEST | P0 | Small | BR-111, BR-113 | `tests/Feature/Services/NotificationPreferenceTest.php` |

---

## Cycle 4: User Deactivation & Transfer (~2 days)

> **Operational P1.** Employee leaves → open WOs and escalation chains break without this.

### Backend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-040 | Add deactivated_at field to User model + migration | BUILD | P1 | Quick Win | BR-122, SM-014 | `app/Models/User.php`, migration |
| P11-041 | Create UserDeactivationService (reassign WOs, remove from chains, log) | BUILD | P1 | Medium | BR-123, BR-124 | `app/Services/Users/UserDeactivationService.php` |
| P11-042 | Add deactivate/reactivate endpoints to UserManagementController | BUILD | P1 | Small | BR-122, BR-126 | `app/Http/Controllers/UserManagementController.php` |
| P11-043 | Add deactivated user scopes (exclude from dropdowns, allow in history) | ENHANCE | P1 | Small | BR-125 | `app/Models/User.php` |
| P11-044 | Block auth for deactivated users | ENHANCE | P1 | Quick Win | BR-122 | `app/Http/Middleware/` or Fortify config |
| P11-045 | Write deactivation tests (WO reassignment, chain removal, auth block) | TEST | P1 | Medium | BR-122-126 | `tests/Feature/Services/UserDeactivationTest.php` |

### Frontend Tasks

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-046 | Add Deactivate/Reactivate actions + status badge to Users Index | BUILD | P1 | Small | BR-122, BR-126 | `resources/js/pages/settings/users/index.tsx` |
| P11-047 | Add active/deactivated filter to Users Index | ENHANCE | P1 | Quick Win | BR-125 | `resources/js/pages/settings/users/index.tsx` |

---

## Cycle 5: Site Comparison & SLA Dashboard (~3 days)

> **Operational P1.** Regional managers need "which site is worst?" + org_admins need "prove ROI to board."

### Site Comparison

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-050 | Create SiteComparisonController + SiteComparisonService | BUILD | P1 | Medium | BR-115, BR-116 | `app/Http/Controllers/SiteComparisonController.php`, `app/Services/Sites/SiteComparisonService.php` |
| P11-051 | Create Site Comparison page (`/sites/compare`) | BUILD | P1 | Medium | BR-115-118 | `resources/js/pages/sites/compare.tsx` |
| P11-052 | Add route, permission, nav entry for Site Comparison | BUILD | P1 | Quick Win | PM-005 | `routes/web.php`, seeder, `navigation.ts` |
| P11-053 | Write site comparison tests | TEST | P1 | Small | BR-115, BR-116 | `tests/Feature/Http/SiteComparisonTest.php` |

### SLA & KPI Dashboard

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-054 | Create PerformanceAnalyticsController + PerformanceAnalyticsService | BUILD | P1 | Medium | BR-119, BR-120 | `app/Http/Controllers/PerformanceAnalyticsController.php`, `app/Services/Analytics/PerformanceAnalyticsService.php` |
| P11-055 | Create SLA Dashboard page (`/analytics/performance`) | BUILD | P1 | Medium | BR-119-121 | `resources/js/pages/analytics/performance.tsx` |
| P11-056 | Add ROI report PDF export | BUILD | P1 | Small | BR-121 | Inline in controller or `PdfService` |
| P11-057 | Add route, permission, nav entry for SLA Dashboard | BUILD | P1 | Quick Win | PM-005 | `routes/web.php`, seeder, `navigation.ts` |
| P11-058 | Write SLA dashboard tests | TEST | P1 | Small | BR-119, BR-120 | `tests/Feature/Http/PerformanceAnalyticsTest.php` |

---

## Cycle 6: Site Event Timeline (~2 days)

> **Operational P1.** "What happened at Store X last Tuesday?" → instant answer.

| ID | Title | Type | P | Est | Rules | Files |
|---|---|---|---|---|---|---|
| P11-060 | Create SiteTimelineController + SiteTimelineService | BUILD | P1 | Medium | BR-127, BR-128, BR-130 | `app/Http/Controllers/SiteTimelineController.php`, `app/Services/Sites/SiteTimelineService.php` |
| P11-061 | Create Site Timeline page (`/sites/{id}/timeline`) | BUILD | P1 | Medium | BR-127-130 | `resources/js/pages/sites/timeline.tsx` |
| P11-062 | Add route + "View Timeline" button on Site Detail | BUILD | P1 | Quick Win | BR-127 | `routes/web.php`, `resources/js/pages/sites/show.tsx` |
| P11-063 | Write timeline tests (event aggregation, filtering, performance) | TEST | P1 | Small | BR-128, BR-130 | `tests/Feature/Http/SiteTimelineTest.php` |

---

## Cycle 7: Cross-Cutting Sweeps + Polish (~1 day)

> Final polish after all features are built.

| ID | Title | Type | P | Est | Files |
|---|---|---|---|---|---|
| P11-070 | Navigation consistency sweep (new nav entries, ordering, icons) | UX | P2 | Small | `navigation.ts` |
| P11-071 | Permission seeder integrity check (all new permissions added, role assignments correct) | TEST | P2 | Quick Win | `RolesAndPermissionsSeeder.php` |
| P11-072 | Skeleton + EmptyState audit on new pages | UX | P2 | Small | All new pages |
| P11-073 | Mobile responsive audit on new pages (375px) | UX | P2 | Small | All new pages |
| P11-074 | Run full test suite + fix any regressions | TEST | P2 | Small | All tests |
| P11-075 | Update PLATFORM_REFERENCE.md + IMPLEMENTATION_GAP_REPORT.md | DOCS | P2 | Small | Docs |
| P11-076 | Phase 8 validation (verify all Phase 11 specs match built code) | VALIDATE | P2 | Medium | All docs |

---

## Summary

| Metric | Value |
|---|---|
| **Total tasks** | 47 |
| **Cycles** | 7 (0: tech debt, 1-6: features, 7: polish) |
| **Estimated effort** | ~15 days (solo dev) |
| **New pages** | 3 (Site Comparison, SLA Dashboard, Site Timeline) |
| **Modified pages** | 5 (Alerts Index, WO Index, Alert Detail, Profile Settings, Users Index) |
| **New models** | 1 (AlertSnooze) |
| **New services** | 5 (UserDeactivation, SiteComparison, PerformanceAnalytics, SiteTimeline, PruneExpiredExports) |
| **New controllers** | 3 (SiteComparison, PerformanceAnalytics, SiteTimeline) |
| **New permissions** | 3 (view site comparison, view performance analytics, deactivate users) |
| **New tests** | ~12 test files |
| **Business rules covered** | BR-101 → BR-130 (30 rules) |
| **State machines added** | SM-014 (User lifecycle), SM-015 (Alert snooze) |
| **Notifications added** | NT-021 → NT-025 (5 notifications) |

### Build Order Recommendation

```
Start here ──▶ Cycle 0 (tech debt, 1 day)
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
      Cycle 1  Cycle 2  Cycle 4    ← Can parallelize if 2+ devs
      (snooze)  (bulk)  (deactivate)
         │        │
         ▼        │
      Cycle 3 ◄───┘
      (notif prefs)
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
      Cycle 5  Cycle 6              ← Can parallelize
      (compare)  (timeline)
                  │
                  ▼
              Cycle 7 (polish)
```

---

*Phase 6 task breakdown generated 2026-03-23. Ready for Phase 7 feature specs → build.*
