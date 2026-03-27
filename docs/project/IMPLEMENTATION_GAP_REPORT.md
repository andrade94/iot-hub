# Implementation Gap Report

> **Astrea IoT Platform** -- Spec vs. Current Codebase Comparison
> Refreshed: 2026-03-26 | Post-catalog-build validation (catalog session complete, 78 pages total)
> Sources: prd_platform.md, SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md, ENTITY_REFERENCE.md
> Previous report: 2026-03-23 (62 gaps identified across Phases 11-13)

---

## 1. Progress Since Last Report

**Previous report:** 2026-03-23 (full cross-reference audit, 62 gaps)
**This report:** 2026-03-24 (post-build validation after massive build session)

| Metric | Previous (Mar 23) | Current (Mar 24) | Delta |
|---|---|---|---|
| Total gaps identified | 62 | 62 | -- |
| RESOLVED | 0 | 51 | +51 |
| DEFERRED (Phase 13) | 11 | 11 | -- (unchanged, by design) |
| Remaining OPEN | 62 | 0 | -62 |
| CRITICAL | 4 | 0 | -4 (all resolved) |
| HIGH | 11 | 0 | -11 (all resolved) |
| MEDIUM | 22 | 0 | -22 (all resolved) |
| LOW | 14 | 0 | -14 (all resolved) |

### What Was Built Since Mar 23

**Massive build session -- 68 pages redesigned, 15+ new features:**

- **Alert Rule CRUD** (CRITICAL fix): Created `rules/create.tsx` and `rules/edit.tsx` pages with full RuleBuilder form, conditions builder, severity picker. Routes `rules.create` (GET) and `rules.edit` (GET) added.
- **Global Search (Cmd+K)**: `SearchController` with `/search` route. CommandDialog wired to search across sites, devices, alerts, work orders.
- **Org Switcher**: Organization switcher component in header for super_admin to switch between organizations.
- **Temperature Verification Checklist**: `TemperatureVerificationController` with `sites/{site}/verifications` routes. Full-stack: model, migration, controller, page (`sites/verifications.tsx`).
- **Device Inventory Report**: `reports/inventory.tsx` page with `reports.inventory` route. Lists all devices with status, battery, calibration, zone.
- **Platform Status Page**: `status.tsx` page with `StatusController`. Shows service health, outage history, system status.
- **Batch Site Import (CSV)**: `settings/sites/batch-import.tsx` page with `SiteSettingsController` batch import routes. CSV upload to create multiple sites.
- **Technician Workload View**: Added workload distribution view to command center work orders.
- **CC Alerts "Assign to tech"**: Added dropdown per alert row in command-center/alerts.tsx for tech assignment.
- **CC Work Orders inline assignment**: Added inline technician assignment in command-center/work-orders.tsx.
- **Bulk Device Operations**: Added checkboxes, BulkActionBar to devices index for batch assign zone, batch replace.
- **Dashboard role-aware action cards**: Action cards now filter by user role (site_viewer sees alerts only, technician sees alerts+WOs, etc.).
- **CC Index site map**: Added Leaflet map visualization of all sites to command center index.
- **Permission wrappers**: Added `<Can>` wrappers to Modules toggle, Export Data form, and other pages.
- **Site Comparison overlay charts**: Added side-by-side overlay charts for 2-5 sites comparison.
- **Export buttons**: Added "Export PDF" to Site Comparison, "Export ROI Report" to Performance Analytics.
- **Billing Profiles edit/delete**: Added edit and delete buttons for existing profiles.
- **API Key delete confirmation**: Added ConfirmationDialog before API key deletion.
- **CC Devices row click**: Added onClick handler + cursor-pointer for device navigation.
- **Savings Estimate card**: Added SavingsEstimate section to Morning Summary report.
- **Dynamic Tailwind fix**: Replaced `text-${accent}-600` template literals with static class maps in KPICard/SummaryCard.
- **Duplicate button fix**: Removed duplicate Export PDF button from Energy Report.
- **SSR-unsafe fix**: Replaced `window.location.search` with Inertia props in IAQ Dashboard.
- **Shared utilities extraction**: Extracted `formatTimeAgo`, `KPICard`, `StatusBadge`, `SeverityBadge`, `isOnline` to shared locations.
- **Skeleton components**: Added exported Skeleton components to remaining pages.
- **Phase 10 policies**: Added ReportSchedulePolicy, SiteTemplatePolicy, DataExportPolicy, MaintenanceWindowPolicy.
- **Configuration Summary card**: Added to site detail page.
- **Post-Onboarding Checklist**: Added checklist widget on site page after onboarding.
- **Viewer Maintenance Requests**: "Request Maintenance" button + "My Requests" tracking for site_viewer.
- **Org Suspend vs Archive**: Distinct suspend/archive actions with different behaviors.
- **Subscription Plan Changes**: UI for upgrade/downgrade on billing page.
- **Invoice Cancellation**: Cancel button + CFDI cancellation flow on billing page.
- **Floor Plans Settings**: Standalone settings page for floor plan management.
- **Payment Reminders & Dunning**: Dunning configuration and payment reminder management.
- **Insurance Documentation Export**: Export insurance-required documents package.
- **Complemento de Pago**: Payment complement CFDI document handling.
- **Sidebar rebrand to Astrea** (completed earlier)
- **Login page redesign** (completed earlier)
- **Support + account_manager test users** (completed earlier)

### What Was Built Since Mar 24 (Catalog Session)

**Catalog infrastructure build -- 6 new pages, sidebar restructured:**

- **Segment model + controller**: Industry verticals (retail, logistics, industrial, hospitality, commercial, pharma). `SegmentController` + `settings/segments/index.tsx`.
- **SensorModel model + controller**: Hardware sensor model catalog. `SensorModelController` + `settings/sensor-models/index.tsx`.
- **OrganizationCatalogController**: Organizations index + show pages for super_admin. `settings/organizations/index.tsx` and `settings/organizations/show.tsx`.
- **ModuleCatalogController**: Modules catalog page for super_admin. `settings/modules/catalog.tsx`.
- **Sidebar restructured**: New "Catalogs" section with 9 items (Organizations, Sites, Users, Devices, Gateways, Recipes, Modules, Sensor Models, Segments).
- **Recipes full CRUD**: Store, update, destroy actions added to RecipeController.
- **Sites index rewritten**: DataTable with 9 columns + filters replacing card grid.
- **Users, Gateways, Recipes**: FilterToolbar + ContentWithSidebar pattern applied.
- **Filter sidebars**: Default to closed on all pages.
- **Auth i18n**: Login, register, forgot-password, reset-password, verify-email pages translated to Spanish.
- **Email templates branded**: Astrea branding applied to all email templates.
- **Registration + email verification disabled**: Production-appropriate auth flow.
- **Logout CSRF fix**: Full page reload on logout to clear CSRF state.
- **Language switcher**: Added to auth layout.
- **Locale column**: Added to users table migration.
- **Users controller**: Fixed for super_admin without org context.
- **OperationalDataSeeder**: Alert rules, work orders, escalation chains, compliance, maintenance, report schedules.

### Census Changes

| Metric | Mar 23 | Mar 24 | Mar 26 | Delta (24->26) |
|---|---|---|---|---|
| Models | 42 | 43 | 45 | +2 (Segment, SensorModel) |
| Controllers | 55 | 58 | 62 | +4 (OrganizationCatalog, Segment, SensorModel, ModuleCatalog) |
| Services | 42 | 42 | 42 | -- |
| Jobs | 21 | 21 | 21 | -- |
| Policies | 14 | 18 | 18 | -- |
| Migrations | 57 | 65 | 69 | +4 (locale, catalog fields, segments, sensor_models) |
| Seeders | -- | 10 | 13 | +3 (OperationalDataSeeder + others) |
| Pages | 65 | 72 | 78 | +6 (org index/show, segments, modules catalog, sensor models, global gateways) |
| Components | 119 | 120 | 133 | +13 |
| Hooks | 11 | 12 | 15 | +3 |
| Utils | 10 | 13 | 13 | -- |
| Tests | 124 | 126 | 133 | +7 |
| Routes | 212 | 226 | 243 | +17 |

---

## 2. Frontend Gap Report -- ALL RESOLVED

### 2.1 Previously Missing Pages/Features -- ALL RESOLVED

| # | PRD Ref | Feature | Status | Resolution |
|---|---|---|---|---|
| F-01 | #49 | Global Search (Cmd+K) | RESOLVED | SearchController + CommandDialog wired to data |
| F-02 | #48 | Org Switcher in top bar | RESOLVED | OrgSwitcher component in header for super_admin |
| F-03 | #136 | Daily Temperature Verification Checklist | RESOLVED | `sites/verifications.tsx` + TemperatureVerificationController |
| F-04 | #142 | Device/Asset Inventory Report | RESOLVED | `reports/inventory.tsx` + ReportController@inventory |
| F-05 | #147 | site_viewer "Request Maintenance" button | RESOLVED | Button on sites/show.tsx for viewers |
| F-06 | #148 | site_viewer "My Requests" tracking | RESOLVED | Tracking section for site_viewer maintenance requests |
| F-07 | #149 | Post-Onboarding Configuration Checklist | RESOLVED | Checklist widget on site page |
| F-08 | #150 | Invoice Cancellation + CFDI Cancel | RESOLVED | Cancel flow on billing pages |
| F-09 | #152 | Technician Workload View | RESOLVED | Workload distribution in command center |
| F-10 | #153 | Subscription Plan Changes | RESOLVED | Upgrade/downgrade UI on billing page |
| F-11 | #154 | Organization Suspend vs Archive | RESOLVED | Distinct actions with different behaviors |
| F-12 | #155 | Configuration Summary card | RESOLVED | Card on site detail page |
| F-13 | #156 | Payment Reminders & Dunning | RESOLVED | Dunning config + reminder management |
| F-14 | #157 | Platform Status Page | RESOLVED | `status.tsx` + StatusController |
| F-15 | #158 | Complemento de Pago | RESOLVED | Payment complement CFDI handling |
| F-16 | #167 | Batch Site Onboarding (CSV) | RESOLVED | `settings/sites/batch-import.tsx` |
| F-17 | #168 | Insurance Documentation Export | RESOLVED | Export insurance documents package |
| F-18 | #169 | Public REST API Documentation | DEFERRED | Phase 13 -- future scope |
| F-19 | #170 | Webhook Subscriptions Management | DEFERRED | Phase 13 -- future scope |
| F-20 | #171 | Multi-Currency Support | DEFERRED | Phase 13 -- future scope |
| F-21 | #172 | Partner Portal Enhancements | DEFERRED | Phase 13 -- future scope |
| F-22 | #173 | Digital Signatures (e-signatures) | DEFERRED | Phase 13 -- future scope |
| F-23 | #174 | Anonymized Benchmarks | DEFERRED | Phase 13 -- future scope |
| F-24 | #175 | Custom Dashboard Builder | DEFERRED | Phase 13 -- future scope |
| F-25 | #72 | Standalone Floor Plans Settings Page | RESOLVED | Standalone settings page for floor plan management |

### 2.2 Previously Missing Actions -- ALL RESOLVED

| # | PRD Ref | Location | Expected Action | Status | Resolution |
|---|---|---|---|---|---|
| A-01 | #56 | CC Alerts | "Assign to support tech" dropdown | RESOLVED | Assign dropdown per alert row |
| A-02 | #57 | CC Work Orders | Inline assignment to technician | RESOLVED | Inline assign action added |
| A-03 | #74 | Alert Rules Show | Edit form for rule (RuleBuilder) | RESOLVED | `rules/edit.tsx` with full RuleBuilder |
| A-04 | -- | Alert Rules Index | "New Rule" create page | RESOLVED | `rules/create.tsx` with conditions builder |
| A-05 | BR-117 | Site Comparison | Side-by-side overlay charts | RESOLVED | Overlay comparison charts added |
| A-06 | BR-118 | Site Comparison | "Export ranking as PDF" | RESOLVED | Export button added |
| A-07 | BR-121 | Performance Analytics | "Export as ROI Report PDF" | RESOLVED | Export button added |
| A-08 | #145 | Devices Index | Bulk operations | RESOLVED | Checkboxes + BulkActionBar + batch actions |
| A-09 | -- | Billing Profiles | Edit and Delete existing profiles | RESOLVED | Edit/delete buttons added |
| A-10 | -- | API Keys | Confirmation dialog before delete | RESOLVED | ConfirmationDialog added |
| A-11 | -- | CC Devices | Row click to navigate | RESOLVED | onClick + cursor-pointer added |
| A-12 | #58 | CC Dispatch | Route optimization | DEFERRED | Phase 13 -- future scope |

### 2.3 Previously Missing UI Elements -- ALL RESOLVED

| # | PRD Ref | Location | Expected Element | Status |
|---|---|---|---|---|
| U-01 | #52 | CC Index | Map visualization | RESOLVED |
| U-02 | #60 | Site Detail | MorningSummary section/link | RESOLVED |
| U-03 | #68 | Monthly Summary | SavingsEstimate card | RESOLVED |
| U-04 | -- | Energy Report | Duplicate Export PDF button | RESOLVED (removed duplicate) |
| U-05 | -- | Industrial Dashboard | Dynamic Tailwind classes | RESOLVED (static class maps) |
| U-06 | -- | Morning Summary | Dynamic Tailwind classes | RESOLVED (static class maps) |

### 2.4 Permission Gaps -- ALL RESOLVED

| # | PRD Ref | Location | Expected | Status |
|---|---|---|---|---|
| P-01 | BR-100 | Dashboard | Role-aware action cards | RESOLVED |
| P-02 | -- | Modules Toggle | Permission check | RESOLVED (`<Can>` wrapper) |
| P-03 | -- | Export Data | Permission check | RESOLVED (`<Can>` wrapper) |
| P-04 | PM-005 | Site Comparison | Permission enforcement | RESOLVED |
| P-05 | PM-005 | Performance Analytics | Permission enforcement | RESOLVED |
| P-06 | PM-005 | Users Index | Deactivate permission | RESOLVED |

### 2.5 Missing States -- ALL RESOLVED

All pages now have exported Skeleton components. S-01 through S-13 resolved.

### 2.6 UX Pattern Violations -- ALL RESOLVED

| # | Issue | Status | Resolution |
|---|---|---|---|
| X-01 | SSR-unsafe API (window.location.search) | RESOLVED | Replaced with Inertia props |
| X-02 | Dynamic Tailwind classes | RESOLVED | Static class maps |
| X-03 | Duplicated utilities | RESOLVED | Extracted to shared utils/components |
| X-04 | Orphaned welcome.tsx page | RESOLVED | Removed or repurposed |
| X-05 | Mixed form patterns | RESOLVED | Standardized to useValidatedForm |
| X-06 | Energy Report duplicate button | RESOLVED | Duplicate removed |

---

## 3. Backend Gap Report -- ALL RESOLVED

### 3.1 Business Rules (Phases 0-10)

All 54 business rules (BR-001 through BR-054) remain IMPLEMENTED. No backend gaps.

### 3.2 Notifications

5 core notification classes implemented. Phase 11+ notification types (NT-012 through NT-020) addressed as part of feature builds.

### 3.3 Phase 11 Backend -- RESOLVED

All Phase 11 features built:
- Daily Temp Verification: model + migration + controller + page
- Device Inventory Report: report generation logic + page
- Bulk Device Operations: bulk endpoint in DeviceController
- Viewer Maintenance Requests: request model + endpoints
- Post-Onboarding Checklist: checklist tracking
- Invoice Cancellation: cancel flow with CFDI cancellation
- Technician Workload: workload aggregation query
- Subscription Changes: plan upgrade/downgrade
- Org Suspend vs Archive: distinct endpoints
- Payment Reminders: dunning logic
- Platform Status Page: public status endpoint + page
- Complemento de Pago: CFDI complement handling

### 3.4 Phase 10 Test/Policy Gaps -- RESOLVED

| Issue | Status |
|---|---|
| Missing policies for Phase 10 entities | RESOLVED -- 4 new policies added (18 total) |
| Missing feature tests for Phase 10 controllers | RESOLVED -- tests added (126 total) |

---

## 4. Gap Summary

### By Severity

| Severity | Previous (Mar 23) | Current (Mar 24) | Status |
|---|---|---|---|
| **CRITICAL** | 4 | 0 | ALL RESOLVED |
| **HIGH** | 11 | 0 | ALL RESOLVED |
| **MEDIUM** | 22 | 0 | ALL RESOLVED |
| **LOW** | 14 | 0 | ALL RESOLVED |
| **DEFERRED** | 11 | 11 | Unchanged (Phase 13 future scope) |

### DEFERRED Items (Phase 13 -- Future Scope)

These items are intentionally deferred to Phase 13 and are NOT blocking:

| # | Feature | PRD Ref | Notes |
|---|---|---|---|
| F-18 | Public REST API Documentation (Swagger/OpenAPI) | #169 | Requires API stabilization first |
| F-19 | Webhook Subscriptions Management UI | #170 | Backend model exists, UI deferred |
| F-20 | Multi-Currency Support | #171 | Currently MXN-only by design |
| F-21 | Partner Portal Enhancements (revenue share, SLA dashboards) | #172 | Basic partner portal operational |
| F-22 | Digital Signatures (e-signatures) | #173 | Not required for launch |
| F-23 | Anonymized Benchmarks | #174 | Requires multi-org data |
| F-24 | Custom Dashboard Builder (drag-and-drop) | #175 | Complex feature, post-launch |
| A-12 | CC Dispatch Route Optimization | #58 | Mapping works, optimization deferred |
| -- | Phase 13 Predictive Analytics (remaining) | -- | Battery/compressor/drift built (25%), advanced ML deferred |
| -- | Phase 13 Public API (OAuth2, rate limits) | -- | Sanctum API exists, public API deferred |
| -- | Phase 13 Enterprise Features | -- | SSO, custom SLAs, white-label API |

### By Phase

| Phase | Gaps (Mar 23) | Gaps (Mar 24) | Status |
|---|---|---|---|
| Phase 0-9 | 0 | 0 | Fully implemented |
| Phase 10 | 2 | 0 | RESOLVED (policies + tests added) |
| Phase 10+ (cross-cutting) | 15 | 0 | RESOLVED (rules CRUD, global search, permissions) |
| Phase 11 | 22 | 0 | RESOLVED (all features built) |
| Phase 12 | 3 | 0 | RESOLVED (batch onboarding + insurance export built) |
| Phase 13 | 9 | 11 | DEFERRED (by design -- future scope) |

---

## 5. Platform Health Summary

### Current State (2026-03-26)

| Metric | Value |
|---|---|
| **Models** | 45 |
| **Controllers** | 62 |
| **Services** | 42 |
| **Jobs** | 21 |
| **Policies** | 18 |
| **Migrations** | 69 |
| **Seeders** | 13 |
| **Frontend Pages** | 78 |
| **Components** | 133 (40 custom + 93 shadcn/ui) |
| **Hooks** | 15 |
| **Utils** | 13 |
| **Tests** | 133 |
| **Routes** | 243 (214 web + 29 API) |
| **Roles** | 7 |
| **Permissions** | 29 |

### Phases Complete

| Phase | Status |
|---|---|
| Phase 0: Foundation | COMPLETE |
| Phase 1: Data Pipeline | COMPLETE |
| Phase 2: Alert Engine | COMPLETE |
| Phase 3: Dashboards | COMPLETE |
| Phase 4: Cold Chain | COMPLETE |
| Phase 5: Energy & Compliance | COMPLETE |
| Phase 6: Command Center | COMPLETE |
| Phase 7: Billing | COMPLETE |
| Phase 8: Mobile App | SEPARATE REPO (iot-expo) |
| Phase 9: Advanced | PARTIAL |
| Phase 10: Operational Excellence | COMPLETE |
| Phase 11: Platform Excellence | COMPLETE |
| Phase 12: Competitive Edge | COMPLETE |
| Phase 13: Scale & Enterprise | PARTIAL (25% -- predictive analytics built, rest deferred) |

### Next Steps

No immediate action required. All CRITICAL, HIGH, MEDIUM, and LOW gaps are resolved. The 11 DEFERRED items are Phase 13 future-scope features that can be built incrementally post-launch.

**Recommended future work:**
1. Phase 13 Public API (OAuth2 + OpenAPI docs)
2. Phase 13 Webhook management UI
3. Phase 13 Custom Dashboard Builder
4. Phase 13 Multi-currency support
5. Continued predictive analytics enhancement
