# Astrea IoT Hub -- Manual QA Testing Guide

**Version:** 2.0
**Date:** 2026-03-25
**Platform:** http://iot-hub.test (Laravel Herd)
**Source:** Merged from WORKFLOW_UX_DESIGN.md per-page specs + SYSTEM_BEHAVIOR_SPEC.md business rules
**Purpose:** Walk through every page and feature, testing functionality and evaluating UX/UI across all roles.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Checkbox -- mark `[x]` when passed |
| **SA** | super_admin |
| **SUP** | support |
| **AM** | account_manager |
| **TECH** | technician |
| **OA** | client_org_admin |
| **SM** | client_site_manager |
| **SV** | client_site_viewer |
| **(gap)** | Known missing feature per WORKFLOW_UX_DESIGN.md |
| **BUG** | Confirmed bug per WORKFLOW_UX_DESIGN.md Section 8.4 |

---

## Phase 0: Setup

### 0.1 Environment Preparation

```bash
# 1. Reset database with fresh seed data
php artisan migrate:fresh --seed

# 2. Start development services (Vite, queue, Reverb WebSocket, logs)
composer dev

# 3. Verify the app loads
open http://iot-hub.test
```

- [ ] `migrate:fresh --seed` completes without errors
- [ ] `composer dev` starts Vite, queue worker, Reverb, and log tail
- [ ] `http://iot-hub.test` loads (should redirect to `/login`)

### 0.2 Test Credentials

| # | Email | Password | Role | Owner | Sidebar Scope |
|---|-------|----------|------|-------|---------------|
| 1 | `super@example.com` | `password` | super_admin | Astrea | Full (all nav groups + org switcher + CC + Partner) |
| 2 | `support@example.com` | `password` | support | Astrea | Full minus some admin actions |
| 3 | `account@example.com` | `password` | account_manager | Astrea | Full minus some admin actions |
| 4 | `tech@example.com` | `password` | technician | Astrea | Reduced (no admin, no analytics) |
| 5 | `admin@example.com` | `password` | client_org_admin | Client | Full client (no CC, no Partner) |
| 6 | `manager@example.com` | `password` | client_site_manager | Client | Moderate client |
| 7 | `viewer@example.com` | `password` | client_site_viewer | Client | Minimal (overview + alerts) |

- [ ] Login with each credential succeeds
- [ ] Each role sees the appropriate sidebar items
- [ ] Org switcher appears only for Astrea roles (SA/SUP/AM/TECH)

---

## Phase 1: Authentication (8 pages)

---

### Login (`/login`)

**How to get here:**
- Direct URL: `http://iot-hub.test/login`
- `/` redirects here
- After logout

**Content (verify these exist):**
- [ ] Email input field
- [ ] Password input field
- [ ] "Keep me signed in" checkbox
- [ ] Submit button with Spinner during processing
- [ ] "Forgot password" link
- [ ] Register link (if `canRegister` prop is true; may be hidden)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit valid credentials | POST `/login` | `/dashboard` |
| "Forgot password" link | Navigate | `/forgot-password` |
| Register link | Navigate (if visible) | `/register` |
| Submit invalid credentials | Validation error displayed | Same page |

**Role differences:** None -- unauthenticated page.

**Business rules to verify:**
- BR-029: After login, all routes are scoped to user's organization

**Screen states to test:**
- [ ] Default: empty form
- [ ] Validation errors: wrong email/password shows error messages
- [ ] Processing: Spinner shows in button during submission
- [ ] Status message: appears after password reset (redirected from `/reset-password`)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Register (`/register`)

**How to get here:**
- From Login page: "Register" link (if enabled)
- Direct URL: `http://iot-hub.test/register`

**Content (verify these exist):**
- [ ] Name input
- [ ] Email input
- [ ] Password input
- [ ] Password confirmation input
- [ ] Submit button with Spinner

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit valid form | POST `/register` | `/dashboard` (or `/verify-email`) |
| "Login" link | Navigate | `/login` |

**Role differences:** None -- unauthenticated page.

**Screen states to test:**
- [ ] Default: empty form
- [ ] Validation errors: duplicate email, weak password, mismatched confirmation
- [ ] Processing: Spinner during submission

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Forgot Password (`/forgot-password`)

**How to get here:**
- From Login page: "Forgot password" link
- Direct URL: `http://iot-hub.test/forgot-password`

**Content (verify these exist):**
- [ ] Email input field
- [ ] Submit button
- [ ] "Back to login" link
- [ ] **Design inconsistency check:** Uses `LoaderCircle` instead of `Spinner` (should match other auth forms)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit valid email | POST `/forgot-password` | Same page (success message) |
| "Back to login" link | Navigate | `/login` |

**Screen states to test:**
- [ ] Default: empty form
- [ ] Validation errors: invalid email format
- [ ] Processing: LoaderCircle shows (note inconsistency with Spinner)
- [ ] Success: status message displayed ("reset link sent")

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Reset Password (`/reset-password`)

**How to get here:**
- From email: password reset link with token
- Direct URL requires valid `token` and `email` query params

**Content (verify these exist):**
- [ ] Email field (pre-filled, read-only)
- [ ] Password input
- [ ] Password confirmation input
- [ ] Hidden token field
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit valid passwords | POST `/reset-password` | `/login` with status message |

**Screen states to test:**
- [ ] Default: email pre-filled from link
- [ ] Validation errors: weak password, mismatched confirmation
- [ ] Processing: Spinner during submission
- [ ] Invalid/expired token: error message

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Verify Email (`/verify-email`)

**How to get here:**
- Automatic redirect when authenticated but email unverified

**Content (verify these exist):**
- [ ] Informational message about verification requirement
- [ ] "Resend verification email" button
- [ ] Logout link

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| "Resend" button | POST `/email/verification-notification` | Same page (success status) |
| Logout link | POST `/logout` | `/login` |
| Click email verification link | GET verify URL | `/dashboard` |

**Screen states to test:**
- [ ] Default: message + resend button
- [ ] After resend: success status message

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Confirm Password (`/confirm-password`)

**How to get here:**
- Automatic redirect when accessing sensitive actions requiring re-authentication

**Content (verify these exist):**
- [ ] Explanation text
- [ ] Password input field
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit correct password | POST | Originally intended route |

**Screen states to test:**
- [ ] Default: password form
- [ ] Validation errors: wrong password
- [ ] Processing state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Two-Factor Challenge (`/two-factor-challenge`)

**How to get here:**
- Automatic redirect after login when 2FA is enabled on account

**Content (verify these exist):**
- [ ] Mode toggle: TOTP code vs Recovery code
- [ ] TOTP mode: 6-digit code input
- [ ] Recovery mode: recovery code text input
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit valid TOTP code | POST `/two-factor-challenge` | `/dashboard` |
| Submit valid recovery code | POST `/two-factor-challenge` | `/dashboard` |
| Toggle mode link | Client-side mode switch | Same page (different input) |

**Screen states to test:**
- [ ] TOTP mode (default): 6-digit input
- [ ] Recovery mode: text input
- [ ] Validation errors: invalid code
- [ ] Processing state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### Privacy Accept (`/privacy/accept`)

**How to get here:**
- Automatic redirect when authenticated user has not accepted privacy policy

**Content (verify these exist):**
- [ ] LFPDPPP (Mexican federal privacy law) policy text
- [ ] Accept checkbox
- [ ] Submit button (disabled until checkbox checked)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Check checkbox + submit | POST | `/dashboard` |

**Screen states to test:**
- [ ] Default: checkbox unchecked, button disabled
- [ ] Checked: button enabled
- [ ] Processing state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 2: Catalogs & Configuration (27 pages)

> **Test as:** super_admin first, then org_admin. These pages configure entities used by all other features.

---

### 2.1 Organization Settings (`/settings/organization`)

**How to get here:**
- Sidebar: Settings > Organization
- Direct URL

**Content (verify these exist):**
- [ ] Name field
- [ ] Timezone select
- [ ] Opening hour time input
- [ ] Branding section: primary_color color picker
- [ ] Branding section: secondary_color color picker
- [ ] Branding section: font select
- [ ] Branding section: logo upload
- [ ] Save button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Save | PATCH organization | Same page (toast confirmation) |
| Upload logo | File upload | Same page (preview updates) |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Entire page | Visible | Visible | Hidden (403) | Hidden (403) | Hidden (403) |

Gated by: "manage org settings" permission.

**Business rules to verify:**
- BR-029: Organization scope enforced -- can only edit own org (unless super_admin switching)
- BR-031: super_admin can switch orgs via session

**Screen states to test:**
- [ ] Pristine form with current values
- [ ] Dirty form (unsaved changes)
- [ ] Submitting state
- [ ] Validation errors

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.2 Sites Settings (`/settings/sites`)

**How to get here:**
- Sidebar: Settings > Sites
- Direct URL

**Content (verify these exist):**
- [ ] Table columns: name, address, timezone, status badge, device count, action buttons
- [ ] "Add Site" button (opens SiteForm dialog)
- [ ] Edit button per row (opens SiteForm dialog)
- [ ] Delete button per row (opens ConfirmationDialog)
- [ ] "Onboard" button per site (when status = onboarding)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| "Add Site" button | Opens SiteForm dialog | Same page (dialog) |
| Edit button | Opens SiteForm dialog pre-filled | Same page (dialog) |
| Delete button | Opens ConfirmationDialog | Same page (row removed on confirm) |
| "Onboard" button | Navigate | `/sites/{id}/onboard` |
| Dialog Submit (create) | POST | Same page (new row in table) |
| Dialog Submit (edit) | PATCH | Same page (row updated) |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Add/Edit/Delete buttons | Visible | Visible | Hidden | Hidden | Hidden |
| Onboard button | Visible | Visible | Hidden | Hidden | Hidden |

All CRUD gated by "manage sites" permission.

**Business rules to verify:**
- BR-047: Site onboarding is sequential 5-step wizard
- BR-048: Onboarding completion requires >= 1 gateway, >= 1 device, >= 1 module

**Screen states to test:**
- [ ] Empty table state (no sites)
- [ ] Populated table
- [ ] Dialog open state
- [ ] Dialog submitting state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.2a Batch Site Import (`/settings/sites/batch-import`)

**How to get here:**
- From Sites Settings: batch import button/link
- Direct URL

**Content (verify these exist):**
- [ ] CSV upload form
- [ ] Template download link
- [ ] Validation results display
- [ ] Submit/import button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Upload CSV | Validates file | Same page (shows validation results) |
| Submit import | POST batch create | `/settings/sites` (with toast) |

**Role differences:** Gated by "manage sites" permission.

**Screen states to test:**
- [ ] Default: upload form
- [ ] File selected: validation preview
- [ ] Validation errors in CSV
- [ ] Import success

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.3 Onboarding Wizard (`/sites/{site}/onboard`)

**How to get here:**
- From Sites Settings: "Onboard" button on a site with status = onboarding
- Direct URL

**Content (verify these exist):**
- [ ] Stepper component showing 5 steps
- [ ] Step 1 -- Gateway: serial input, model select, register button
- [ ] Step 2 -- Devices: name, dev_eui, model, app_key, zone inputs, register button
- [ ] Step 3 -- Floor Plans: upload dropzone, device marker placement
- [ ] Step 4 -- Modules: toggle cards (cold_chain, energy, iaq, industrial)
- [ ] Step 5 -- Complete: review summary, "Complete Onboarding" button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Register Gateway (Step 1) | POST ChirpStack API | Same step (gateway added to list) |
| Register Devices (Step 2) | POST | Same step (devices added) |
| Upload Floor Plan (Step 3) | POST file | Same step (preview shown) |
| Activate Modules (Step 4) | POST | Same step (modules toggled) |
| Complete Onboarding (Step 5) | PATCH site status -> active | `/sites/{id}` |
| Step navigation | Click stepper | Same page (different step) |

**Role differences:** Entire page gated by "manage sites" permission.

**Business rules to verify:**
- BR-047: Sequential 5-step wizard (gateway -> devices -> floor plans -> modules -> escalation -> complete). Floor plans optional.
- BR-048: Completion requires >= 1 gateway, >= 1 device, >= 1 module activated
- BR-050: Module activation auto-applies matching recipes to site devices
- BR-043: Recipe application auto-creates AlertRules from Recipe.default_rules

**Screen states to test:**
- [ ] Step 1: empty gateway list, form validation
- [ ] Step 2: empty device list, form validation
- [ ] Step 3: no floor plans uploaded (optional step)
- [ ] Step 4: no modules selected
- [ ] Step 5: requirements not met (button disabled)
- [ ] Step 5: all requirements met (button enabled)
- [ ] ChirpStack API error: toast displayed
- [ ] Completion summary: correct counts shown

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.4 User Management (`/settings/users`)

**How to get here:**
- Sidebar: Settings > Users
- Direct URL

**Content (verify these exist):**
- [ ] Table columns: name, email, role badge, site access, app access, status, actions
- [ ] "Add User" button (opens UserForm dialog)
- [ ] Edit button per row (opens UserForm dialog)
- [ ] Delete button per row (opens ConfirmationDialog)
- [ ] UserForm dialog: name, email, role select, site access multi-select, app access toggle

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| "Add User" button | Opens UserForm dialog | Same page (dialog) |
| Edit button | Opens UserForm dialog pre-filled | Same page (dialog) |
| Delete button | Opens ConfirmationDialog | Same page (row removed) |
| Dialog Submit (create) | POST | Same page (new row) |
| Dialog Submit (edit) | PATCH | Same page (row updated) |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Entire page | Visible | Visible | Hidden (403) | Hidden (403) | Hidden (403) |
| Role select options | All roles | Client roles only | N/A | N/A | N/A |

Gated by "manage users". Role select filtered by `RoleDefinitions.assignable` for current user's role.

**Business rules to verify:**
- BR-030: Site access validated via `canAccessSite()` -- assigned sites shown in multi-select
- BR-033: User permissions cached 5 minutes

**Screen states to test:**
- [ ] Empty table
- [ ] Populated table with multiple roles
- [ ] Dialog open: role select shows only assignable roles
- [ ] Dialog submitting state
- [ ] Validation errors (duplicate email, etc.)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.5 Gateways (`/settings/sites/{site}/gateways`)

**How to get here:**
- Sidebar: Settings > [Site] > Gateways (site-scoped)
- Direct URL

**Content (verify these exist):**
- [ ] Table columns: name, serial, model, status badge, connected devices count, last seen, actions
- [ ] "Add Gateway" button (opens dialog)
- [ ] Edit button per row (opens dialog)
- [ ] Delete button per row (opens ConfirmationDialog)
- [ ] Gateway form dialog

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| "Add Gateway" | Opens dialog | Same page |
| Edit button | Opens dialog pre-filled | Same page |
| Delete button | Opens ConfirmationDialog | Same page |
| Row click | Navigate to detail | `/settings/sites/{site}/gateways/{gateway}` |

**Role differences:** All CRUD gated by "manage devices" permission.

**Business rules to verify:**
- BR-004: Gateway marked offline after 30 minutes with no heartbeat
- SM-009: Gateway status: offline <-> online based on heartbeat

**Screen states to test:**
- [ ] Empty table
- [ ] Populated table with online/offline gateways
- [ ] Dialog states

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.5a Gateway Detail (`/settings/sites/{site}/gateways/{gateway}`)

**How to get here:**
- From Gateways table: row click

**Content (verify these exist):**
- [ ] Gateway details card: name, serial, model, firmware, status, last seen
- [ ] Connected devices table: device name, model, status, last seen

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| (Read-only page) | No actions | N/A |

**Role differences:** None.

**Screen states to test:**
- [ ] Gateway with connected devices
- [ ] Gateway with empty devices table

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.6 Devices -- Site-Scoped (`/settings/sites/{site}/devices`)

**How to get here:**
- Sidebar: Settings > [Site] > Devices (site-scoped)
- Direct URL

**Content (verify these exist):**
- [ ] Stats bar: total, online, offline, critical battery
- [ ] Filter bar: status select, search input
- [ ] Table columns: name, model, status, battery, signal, last seen, actions
- [ ] "Add Device" button (opens dialog)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| "Add Device" button | Opens dialog | Same page |
| Row click | Navigate | `/settings/sites/{site}/devices/{device}` |
| Status filter | Re-fetches with filter | Same page |
| Search input | Debounced re-fetch | Same page |

**Role differences:** Add button gated by "manage devices" permission.

**Business rules to verify:**
- BR-003: Device marked offline after 15 minutes with no reading
- BR-006: Auto-create work order when device battery < 20%

**Screen states to test:**
- [ ] Empty table (no filters)
- [ ] Empty table (filters active)
- [ ] Populated table
- [ ] Stats bar counts match table data

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.6a Device Detail -- Site-Scoped (`/settings/sites/{site}/devices/{device}`)

**How to get here:**
- From Devices (site-scoped) table: row click

**Content (verify these exist):**
- [ ] Device details: name, dev_eui, model, firmware, zone, status, battery, signal
- [ ] Gateway link
- [ ] Recipe link (if assigned)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Gateway link | Navigate | Gateway detail page |
| Recipe link | Navigate | `/settings/recipes/{recipe}` |

**Role differences:** None (read-only).

**Screen states to test:**
- [ ] Device with gateway and recipe assigned
- [ ] Device without recipe

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.7 Devices -- Global Index (`/devices`)

**How to get here:**
- Sidebar: Devices
- Direct URL

**Content (verify these exist):**
- [ ] Header with total device count
- [ ] Filter bar: site select, status select, search input
- [ ] Table columns: name, model (mono font), site, zone, status badge, battery % (mono font), last seen date
- [ ] Pagination controls
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Row click | Navigate | `/devices/{id}` |
| Site filter | Re-fetches with filter | Same page |
| Status filter | Re-fetches with filter | Same page |
| Search input | Debounced re-fetch | Same page |

**Role differences:** None.

**Business rules to verify:**
- BR-003: Devices offline > 15 min shown with offline status badge
- BR-008: Device status auto-recovers to active when new reading received

**Screen states to test:**
- [ ] **(gap)** No skeleton -- verify page renders promptly
- [ ] Empty with filters: "No devices match your filters"
- [ ] Empty without filters: "No devices found"
- [ ] Populated: table with rows, pagination working

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.8 Device Detail (`/devices/{device}`)

**How to get here:**
- From Devices Index: row click
- From Zone Detail: device row click

**Content (verify these exist):**
- [ ] Header: device name, model, status badge, dev_eui
- [ ] 4 StatCards: battery level, signal strength, last seen, alert count
- [ ] Chart with period/metric toggle controls (Recharts)
- [ ] Latest readings grid (metric name -> current value)
- [ ] Sidebar: device info card (model, firmware, zone, site)
- [ ] Sidebar: alert history list
- [ ] Replace device button (if permission)
- [ ] `DeviceShowSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle (24h/7d/30d) | Re-fetches chartData | Same page |
| Metric select dropdown | Re-fetches chartData | Same page |
| "Replace device" button | Opens replacement dialog | Same page (dialog) |
| Alert history item click | Navigate | `/alerts/{id}` |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Replace device button | Visible | Visible | Hidden | Hidden | Hidden |

Replace button gated by "manage devices" permission.

**Business rules to verify:**
- BR-001: MQTT payloads decoded via DecoderFactory matching device.model
- BR-002: Sensor readings dual-written (PostgreSQL + Redis)
- BR-007: All sensor readings broadcast via Reverb WebSocket

**Screen states to test:**
- [ ] `DeviceShowSkeleton` appears on load
- [ ] Chart populated with data for selected period/metric
- [ ] Chart empty: message when no readings for selected period/metric
- [ ] Alert history populated
- [ ] Alert history empty: message
- [ ] Replacement dialog flow

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.9 Recipes (`/settings/recipes`)

**How to get here:**
- Sidebar: Settings > Recipes
- Direct URL

**Content (verify these exist):**
- [ ] Card grid: recipe name, module, description, threshold count
- [ ] Cards are clickable

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Card click | Navigate | `/settings/recipes/{recipe}` |

**Role differences:** None (read-only).

**Screen states to test:**
- [ ] Empty state (no recipes)
- [ ] Populated card grid

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.9a Recipe Detail (`/settings/recipes/{recipe}`)

**How to get here:**
- From Recipes: card click
- From Device Detail (site-scoped): recipe link

**Content (verify these exist):**
- [ ] Recipe details: name, module, description
- [ ] Default thresholds list
- [ ] Override thresholds editor (when `editable` flag is true)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Save Overrides | PATCH | Same page (toast) |
| Back | Navigate | `/settings/recipes` |

**Role differences:** `editable` flag controls whether override editor is shown.

**Business rules to verify:**
- BR-043: Recipe application auto-creates AlertRules from Recipe.default_rules matching device sensor_model

**Screen states to test:**
- [ ] Read-only mode (editable = false)
- [ ] Editable mode (editable = true): override inputs visible
- [ ] Save validation

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.10 Alert Rules (`/settings/sites/{site}/alert-rules`)

**How to get here:**
- Sidebar: Settings > [Site] > Alert Rules (site-scoped)
- From Alert Tuning: "Tune" links
- Direct URL

**Content (verify these exist):**
- [ ] Card grid: rule name, metric, operator + threshold, severity badge, enabled toggle
- [ ] Add Rule button
- [ ] Edit/delete actions per card

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Add Rule | Navigate or dialog | POST new rule |
| Toggle enable/disable | PATCH inline | Same page |
| Edit button | Navigate | Edit form or detail |
| Delete button | Opens ConfirmationDialog | Same page (card removed) |
| Card click | Navigate | `/settings/sites/{site}/alert-rules/{rule}` |

**Role differences:** All actions gated by "manage alert rules" permission.

**Business rules to verify:**
- BR-010: Alert rules scoped to site + device, evaluated per-reading
- BR-011: Duration-based threshold: fires only after N consecutive readings breach threshold
- BR-012: Cooldown: no duplicate alert within `cooldown_minutes`

**Screen states to test:**
- [ ] Empty state (no rules)
- [ ] Populated card grid with enabled/disabled rules
- [ ] Toggle switches work

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.10a Alert Rule Detail (`/settings/sites/{site}/alert-rules/{rule}`)

**How to get here:**
- From Alert Rules: card click
- From Alert Tuning: "Tune" link

**Content (verify these exist):**
- [ ] Rule details: name, metric, operator, threshold, severity, hysteresis, cooldown, enabled status
- [ ] Escalation chain link (if assigned)
- [ ] **BUG:** No edit form -- edit button from Alert Rules grid navigates here but only shows read-only detail

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| (Read-only page -- **BUG**: should have edit form) | No edit actions | N/A |
| Escalation chain link | Navigate | Escalation chain page |

**Screen states to test:**
- [ ] Standard detail view
- [ ] Verify BUG: no edit capability exists

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.10b Alert Rule Create (`/sites/{site}/rules/create`)

**How to get here:**
- From Alert Rules: "Add Rule" button
- Direct URL

**Content (verify these exist):**
- [ ] RuleBuilder form
- [ ] Fields for name, metric, operator, threshold, severity, etc.
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit form | POST create rule | Alert Rules index |

**Role differences:** Gated by "manage alert rules" permission.

**Screen states to test:**
- [ ] Default empty form
- [ ] Validation errors
- [ ] Submitting state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.10c Alert Rule Edit (`/sites/{site}/rules/{rule}/edit`)

**How to get here:**
- From Alert Rules: edit action on a card
- Direct URL

**Content (verify these exist):**
- [ ] RuleBuilder form pre-filled with existing rule data
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit form | PATCH update rule | Alert Rules index |

**Role differences:** Gated by "manage alert rules" permission.

**Screen states to test:**
- [ ] Pre-filled form
- [ ] Validation errors
- [ ] Submitting state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.11 Escalation Chains (`/settings/sites/{site}/escalation-chains`)

**How to get here:**
- Sidebar: Settings > [Site] > Escalation Chains (site-scoped)
- Direct URL

**Content (verify these exist):**
- [ ] Table columns: name, levels count, actions
- [ ] "Add Chain" button
- [ ] Chain form with LevelBuilder: ordered levels, each with delay (minutes), recipients (users), channels (email/sms/push/whatsapp)
- [ ] Edit/delete actions per chain

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Add Chain | Opens form | Same page |
| Edit Chain | Opens form pre-filled | Same page |
| Delete Chain | Opens ConfirmationDialog | Same page |

**Role differences:** All actions gated by "manage alert rules" permission.

**Business rules to verify:**
- BR-017: Escalation chain: each level has delay_minutes, user_ids, and channels (push/email/whatsapp)

**Screen states to test:**
- [ ] Empty table
- [ ] Populated table
- [ ] LevelBuilder: add/remove levels, configure channels

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.12 Modules (`/settings/sites/{site}/modules`)

**How to get here:**
- Sidebar: Settings > [Site] > Modules (site-scoped)
- Direct URL

**Content (verify these exist):**
- [ ] Module cards: cold_chain, energy, iaq, industrial
- [ ] Each card: name, description, enabled toggle

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Toggle module switch | PATCH | Same page (module toggled) |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Toggle switch | Visible | Visible | Visible | Visible | Visible |

**(gap)** No permission gate -- any authenticated user can toggle modules. Should be gated.

**Business rules to verify:**
- BR-050: Module activation auto-applies matching recipes to site devices

**Screen states to test:**
- [ ] All modules disabled
- [ ] Some modules enabled
- [ ] Toggle and verify recipe application

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.13 Site Templates (`/settings/site-templates`)

**How to get here:**
- Sidebar: Settings > Site Templates
- Direct URL

**Content (verify these exist):**
- [ ] Card grid: template name, source site, device count, module list
- [ ] "Create Template" button (opens dialog to select source site)
- [ ] Delete button per card

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Create Template | Opens dialog | Same page (dialog) |
| Delete Template | DELETE | Same page (card removed) |

**Role differences:**
**(gap)** No permission gates on any action -- create and delete are unprotected.

**Screen states to test:**
- [ ] Empty state (no templates)
- [ ] Populated card grid
- [ ] Create from source site dialog
- [ ] Delete action (no confirmation dialog reported)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.14 Maintenance Windows (`/settings/sites/{site}/maintenance-windows`)

**How to get here:**
- Sidebar: Settings > [Site] > Maintenance Windows (site-scoped)
- Direct URL

**Content (verify these exist):**
- [ ] Card list: title, schedule, suppress_alerts toggle, status
- [ ] "Add Window" button (opens WindowFormDialog)
- [ ] WindowFormDialog: title, description, start, end, recurrence, suppress_alerts
- [ ] Edit/delete actions per card

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Add Window | Opens dialog | Same page |
| Edit Window | Opens dialog pre-filled | Same page |
| Delete Window | Opens ConfirmationDialog | Same page |
| Toggle suppress_alerts | PATCH | Same page |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Add/Edit/Delete | Visible | Visible | Varies | Hidden | Hidden |
| Suppress toggle | Visible | Visible | Visible | Visible | Visible |

CRUD gated by "manage maintenance windows". **(gap)** Suppress toggle has no permission gate.

**Screen states to test:**
- [ ] Empty state
- [ ] Populated card list
- [ ] Dialog states
- [ ] Active vs expired windows

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.15 Report Schedules (`/settings/report-schedules`)

**How to get here:**
- Sidebar: Settings > Report Schedules
- Direct URL

**Content (verify these exist):**
- [ ] Card list: report type, site, frequency, recipient, enabled toggle, actions
- [ ] "Add Schedule" button (opens form)
- [ ] Schedule form: report type select, site select, frequency select, recipient email
- [ ] **Note:** Only 1 recipient captured despite model supporting array

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Add Schedule | Opens form | Same page |
| Toggle enable/disable | PATCH | Same page |
| Delete schedule | DELETE | Same page |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Add button | Gated | Gated | Hidden | Hidden | Hidden |
| Toggle/Delete | **(gap)** No gate | **(gap)** No gate | **(gap)** No gate | **(gap)** No gate | **(gap)** No gate |

Only create is properly gated by "manage report schedules". Toggle and delete have no permission checks.

**Screen states to test:**
- [ ] Empty state
- [ ] Populated card list
- [ ] Form validation

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.16 Compliance Calendar (`/settings/compliance`)

**How to get here:**
- Sidebar: Settings > Compliance
- Direct URL

**Content (verify these exist):**
- [ ] Events grouped by month
- [ ] Each event: type, description, date, status
- [ ] Client-side type/date filtering

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Filter by type | Client-side filter | Same page |
| Filter by date | Client-side filter | Same page |

**Role differences:** Entire page gated by "manage org settings" permission.

**Business rules to verify:**
- BR-038: Compliance reminders sent at 30, 7, and 1 day before due date
- SM-006: Compliance event lifecycle: upcoming -> overdue -> completed

**Screen states to test:**
- [ ] Empty state (no events)
- [ ] Populated with events in multiple states (upcoming, overdue, completed, cancelled)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.17 API Keys (`/settings/api-keys`)

**How to get here:**
- Sidebar: Settings > API Keys
- Direct URL

**Content (verify these exist):**
- [ ] Create form: name input, Generate button
- [ ] Token display (one-time, after generation)
- [ ] Table columns: name, last used, created, actions (delete)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Generate Key | POST -> shows token | Same page (token displayed once) |
| Delete Key | DELETE | Same page (row removed) |

**Role differences:** None -- no permission checks. **(gap)** Delete has no confirmation dialog.

**Screen states to test:**
- [ ] Empty table
- [ ] Token display (verify it appears only once and cannot be re-shown)
- [ ] Populated table
- [ ] Delete without confirmation (gap)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.18 Integrations (`/settings/integrations`)

**How to get here:**
- Sidebar: Settings > Integrations
- Direct URL

**Content (verify these exist):**
- [ ] SAP integration card: enabled toggle, cron schedule input
- [ ] CONTPAQi integration card: enabled toggle, cron schedule input

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Toggle integration | PATCH | Same page |
| Update schedule + save | PATCH | Same page |

**Role differences:** None.

**Business rules to verify:**
- BR-028: SAP/CONTPAQ exports are non-blocking -- failure stores local JSON copy
- BR-045: Webhook auto-deactivation after 10 consecutive failures

**Screen states to test:**
- [ ] Both disabled
- [ ] Both enabled
- [ ] Toggle states

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.19 Export Data (`/settings/export`)

**How to get here:**
- Sidebar: Settings > Export Data
- Direct URL

**Content (verify these exist):**
- [ ] Export request form: site select, data type select, date range, format (CSV/Excel)
- [ ] Export history list: requested date, site, type, format, status, download link

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Request Export | POST | Same page (new entry in history) |
| Download link | Download file | Browser download |

**Role differences:** **(gap)** No permission checks -- any authenticated user can export.

**Screen states to test:**
- [ ] Empty history
- [ ] Export in-progress state
- [ ] Completed export with download link
- [ ] Form validation

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.20 Billing (`/settings/billing`)

> **Note:** Billing is currently deactivated. Quick check only.

**How to get here:**
- Sidebar: Settings > Billing
- Direct URL

**Content (verify these exist):**
- [ ] Subscription card: plan name, status, monthly amount, next billing date
- [ ] Invoices table: date, amount, status badge, download link
- [ ] Generate invoice button
- [ ] Manage Profiles link

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Generate Invoice | POST | Same page |
| Download Invoice | Download PDF | Browser download |
| Manage Profiles | Navigate | `/settings/billing/profiles` |

**Role differences:** Entire page gated by "manage org settings" permission.

**Business rules to verify:**
- BR-021 - BR-027: Full billing lifecycle (subscription, pricing, invoices, CFDI)
- SM-003: Invoice lifecycle: draft -> sent -> paid (or overdue)

**Screen states to test:**
- [ ] Deactivated state (verify graceful handling)
- [ ] Empty invoices table
- [ ] Page accessible only by org_admin / super_admin

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 2.20a Billing Profiles (`/settings/billing/profiles`)

**How to get here:**
- From Billing page: "Manage Profiles" link
- Direct URL

**Content (verify these exist):**
- [ ] Profile form (Mexican fiscal fields): razon_social, RFC, regimen_fiscal, uso_CFDI, domicilio_fiscal
- [ ] Existing profiles list (read-only)
- [ ] **BUG:** No edit/delete for existing profiles

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Create Profile | POST | Same page (new profile in list) |
| Back | Navigate | `/settings/billing` |

**Role differences:** Gated by "manage org settings".

**Business rules to verify:**
- BR-025: CFDI timbrado via Facturapi using billing profile

**Screen states to test:**
- [ ] Empty list
- [ ] Form validation (RFC format, etc.)
- [ ] Verify BUG: cannot edit/delete existing profiles

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 3: Core Operations

> **Test as:** org_admin first, then site_manager, site_viewer, technician. Verify role-based access differences.

---

### 3.1 Dashboard (`/dashboard`)

**How to get here:**
- Sidebar: Dashboard
- Post-login redirect
- Direct URL

**Content (verify these exist):**
- [ ] Hero header displaying current organization name
- [ ] 4 StatCards: Total Devices, Online, Active Alerts, Open Work Orders
- [ ] CircularProgress gauge for fleet health percentage
- [ ] "Needs Attention" card: unacknowledged alerts, overdue work orders, critical battery devices
- [ ] Sites section: grid/map toggle rendering SiteCards
- [ ] `DashboardSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Toggle Grid/Map | Button | Same page (re-renders sites section) |
| ActionItem click (Needs Attention) | Navigate | Filtered list (alerts/WOs/devices) |
| SiteCard click | Navigate | `/sites/{id}` |

**Role differences:** None -- all roles see the same dashboard scoped to their accessible sites.

**Business rules to verify:**
- BR-029: All data scoped to user's organization
- BR-030: Site access validated -- user only sees their accessible sites

**Screen states to test:**
- [ ] `DashboardSkeleton` loading state on first load
- [ ] EmptyState: when organization has no sites
- [ ] Populated: all StatCards, SiteCards, Needs Attention items

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.2 Sites Index (`/sites`)

**How to get here:**
- Sidebar: Sites
- Direct URL

**Content (verify these exist):**
- [ ] Header with total site count
- [ ] Card grid: each card shows site name, device count, status badge, online ratio with progress bar, active alert count
- [ ] **(gap)** No skeleton loading state
- [ ] **(gap)** No empty state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Card click | Navigate | `/sites/{id}` |

**Role differences:** None.

**Business rules to verify:**
- BR-030: User only sees sites they have access to

**Screen states to test:**
- [ ] **(gap)** No skeleton -- verify page loads promptly
- [ ] **(gap)** No empty state -- verify behavior when no sites
- [ ] Populated: card grid with multiple sites

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.3 Site Detail (`/sites/{site}`)

**How to get here:**
- From Sites Index: card click
- From Dashboard: SiteCard click
- From CC Org Show: site row click
- Direct URL

**Content (verify these exist):**
- [ ] Header: site name, status badge, timezone, report quick-links
- [ ] 5 StatCards (site-level KPIs)
- [ ] CircularProgress fleet health gauge
- [ ] FloorPlanView (if floor plans uploaded)
- [ ] Zones grid: ZoneCard with temperature reading + device progress bar
- [ ] Sidebar: Active Alerts list
- [ ] `SiteShowSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Temperature Report link | Navigate | `/sites/{id}/reports/temperature` |
| Summary Report link | Navigate | `/sites/{id}/reports/summary` |
| Zone card click | Navigate | `/sites/{id}/zones/{zone}` |
| Alert card click | Navigate | `/alerts/{id}` |
| "View all alerts" link | Navigate | `/alerts` (filtered by site) |

**Role differences:** None.

**Business rules to verify:**
- BR-030: Site access validated
- BR-047: Onboarding checklist visible if site status = onboarding

**Screen states to test:**
- [ ] `SiteShowSkeleton` loading state
- [ ] Empty zones: message when no zones configured
- [ ] Empty alerts: message when no active alerts
- [ ] Populated: zones grid + alerts sidebar
- [ ] Floor plan view (when floor plans exist)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.4 Zone Detail (`/sites/{site}/zones/{zone}`)

**How to get here:**
- From Site Detail: zone card click

**Content (verify these exist):**
- [ ] Header: zone name, device count breakdown (online/total)
- [ ] ZoneChart: Recharts AreaChart with period toggle (24h / 7d / 30d)
- [ ] Metric summary cards
- [ ] Devices table columns: name + online dot, model, status, battery %, signal strength, last seen
- [ ] Alerts sidebar
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle (24h/7d/30d) | Re-fetches chartData via Inertia visit | Same page |
| Device row click | Navigate | `/devices/{id}` |
| Alert card click | Navigate | `/alerts/{id}` |

**Role differences:** None.

**Business rules to verify:**
- BR-007: Sensor readings broadcast via Reverb for real-time updates

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Chart populated with data
- [ ] Chart empty: text message when no data for period
- [ ] Alerts empty: text message
- [ ] Populated devices table

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.5 Alerts Index (`/alerts`)

**How to get here:**
- Sidebar: Alerts
- From Dashboard: action cards
- From Site/Zone: alert links

**Content (verify these exist):**
- [ ] Header with severity pill counts
- [ ] Filter bar: severity select, status select, date range picker
- [ ] Table columns: checkbox, severity badge, alert name, device + zone, reading (metric:value/threshold), status badge, relative time, action buttons
- [ ] Pagination component
- [ ] `AlertIndexSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Row click | Navigate | `/alerts/{id}` |
| "Acknowledge" button (per-row) | PATCH inline | Same page (toast) |
| "Resolve" button (per-row) | PATCH inline | Same page (toast) |
| "Dismiss" button (per-row) | DELETE inline | Same page (toast) |
| Bulk Acknowledge | PATCH batch | Same page (toast) |
| Bulk Resolve | PATCH batch | Same page (toast) |
| Severity filter | Re-fetches | Same page |
| Status filter | Re-fetches | Same page |
| Date range filter | Re-fetches | Same page |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Acknowledge button | Visible | Visible | Visible | Hidden | Visible |
| Resolve button | Visible | Visible | Visible | Hidden | Visible |
| Dismiss button | Visible | Visible | Visible | Hidden | Hidden |
| Bulk actions | Visible | Visible | Visible | Hidden | Visible |
| Checkboxes | Visible | Visible | Visible | Hidden | Visible |

Dismiss button requires "manage alert rules" permission. Acknowledge/Resolve require "acknowledge alerts" permission.

**Business rules to verify:**
- BR-010: Alert rules scoped to site + device
- BR-013: Auto-resolution after 2 consecutive normal readings
- BR-020: Only active/acknowledged alerts can be resolved or dismissed
- SM-001: Alert lifecycle state transitions (active -> acknowledged -> resolved)

**Screen states to test:**
- [ ] `AlertIndexSkeleton` on first load
- [ ] Empty with no filters (no alerts at all)
- [ ] Empty with filters applied (no results matching)
- [ ] Populated: table with rows, severity badges, status badges
- [ ] Bulk action bar appears when rows selected

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.6 Alert Detail (`/alerts/{alert}`)

**How to get here:**
- From Alerts Index: row click
- From Site/Zone: alert card click
- From Alert Tuning: links

**Content (verify these exist):**
- [ ] Header: rule name, severity badge, status badge, snooze indicator (if snoozed)
- [ ] Main column: Trigger Details card (device name, zone, metric, measured value)
- [ ] Main column: Notification Log card (channel icons, delivery status per recipient)
- [ ] Main column: Corrective Actions card (critical/high only) -- warning banner if none logged, log form, verify button
- [ ] Sidebar: Timeline (triggered -> acknowledged -> resolved vertical stepper)
- [ ] Sidebar: Details card (alert metadata)
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Back button | Navigate | `/alerts` |
| Acknowledge | PATCH | Same page (status updates) |
| Resolve | PATCH | Same page (status updates) |
| Snooze dropdown (30m/1h/2h/4h/8h) | POST | Same page (snooze indicator appears) |
| Cancel snooze | DELETE snooze | Same page (snooze indicator removed) |
| Dismiss | DELETE | Same page (status updates) |
| Log corrective action | POST form | Same page (action logged) |
| Verify corrective action | PATCH | Same page (action verified) |
| Device link | Navigate | `/devices/{device_id}` |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Acknowledge button | Visible | Visible | Visible | Hidden | Visible |
| Resolve button | Visible | Visible | Visible | Hidden | Visible |
| Dismiss button | Visible | Visible | Visible | Hidden | Hidden |
| Log corrective action | Visible | Visible | Visible | Hidden | Visible |
| Verify corrective action | Visible | Visible | Visible | Hidden | Visible |

Corrective action verify requires a different user than the one who logged it.

**Business rules to verify:**
- BR-013: Auto-resolution: 2 consecutive normal readings resolve active alert
- BR-014: Defrost suppression during defrost windows
- BR-015: Alert routing by severity
- BR-016: Alert rate limiting (> 5 in 10 min triggers batch mode)
- BR-020: Only active/acknowledged alerts can be resolved or dismissed
- SM-001: Full alert lifecycle transitions

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Active alert: all action buttons visible (per role)
- [ ] Acknowledged alert: resolve/dismiss visible
- [ ] Resolved alert: no action buttons (terminal state)
- [ ] Dismissed alert: no action buttons (terminal state)
- [ ] Snoozed state: snooze indicator visible, cancel snooze button shown
- [ ] No notifications: Notification Log card hidden
- [ ] Corrective Actions card: only on critical/high severity alerts
- [ ] Corrective action: warning banner when none logged

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.7 Work Orders Index (`/work-orders`)

**How to get here:**
- Sidebar: Work Orders
- From Dashboard: action cards
- Direct URL

**Content (verify these exist):**
- [ ] Header with status counts
- [ ] "New Work Order" button (disabled -- placeholder for future)
- [ ] Filter bar: "My WOs" toggle, status select, priority select, type select
- [ ] Table columns: checkbox, title, type badge, priority badge, status badge, assigned to, site, created date (mono font)
- [ ] Pagination
- [ ] `WorkOrderIndexSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Row click | Navigate | `/work-orders/{id}` |
| New Work Order button | Currently disabled | N/A |
| Bulk assign | Technician select in BulkActionBar | Same page (PATCH batch) |
| "My WOs" toggle | Filter to assigned WOs | Same page |
| Status/Priority/Type filters | Re-fetches | Same page |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| New WO button (disabled) | Visible | Visible | Visible | Hidden | Hidden |
| Checkboxes | Visible | Visible | Visible | Hidden | Hidden |
| Bulk assign | Visible | Visible | Visible | Hidden | Hidden |
| "My WOs" toggle | Hidden | Hidden | Hidden | Hidden | Visible |

Technician: checkboxes hidden, "My WOs" toggle visible. "manage work orders" required for New button and bulk assign.

**Business rules to verify:**
- BR-005: Auto-create work order when device offline > 2 hours
- BR-006: Auto-create work order when device battery < 20%
- SM-002: Work order lifecycle (open -> assigned -> in_progress -> completed)

**Screen states to test:**
- [ ] `WorkOrderIndexSkeleton` on first load
- [ ] Empty with filters
- [ ] Empty without filters
- [ ] Populated table
- [ ] Bulk action bar when rows selected

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.8 Work Order Detail (`/work-orders/{workOrder}`)

**How to get here:**
- From Work Orders Index: row click
- From CC Work Orders: row click
- From CC Dispatch: WO list

**Content (verify these exist):**
- [ ] Header: title, priority badge, status badge
- [ ] Status action buttons (contextual based on current status)
- [ ] Details card: type, description, device, site
- [ ] Photos grid with upload dropzone
- [ ] Notes list with inline add-note form
- [ ] Sidebar: Timeline (status history)
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Assign (select technician) | PATCH | Same page (assignment updates) |
| Start work | PATCH (assigned -> in_progress) | Same page |
| Complete | PATCH (in_progress -> completed) | Same page |
| Cancel | PATCH (-> cancelled) | Same page |
| Upload photo | POST | Same page (photo added to grid) |
| Add note | POST | Same page (note added to list) |
| Device link | Navigate | Device detail page |
| Site link | Navigate | Site detail page |

**Role differences:**
| Element | SA | OA | SM | SV | TECH |
|---|---|---|---|---|---|
| Assign button | Visible | Visible | Visible | Hidden | Hidden |
| Cancel button | Visible | Visible | Visible | Hidden | Hidden |
| Start work button | Hidden | Hidden | Hidden | Hidden | Visible |
| Complete button | Hidden | Hidden | Hidden | Hidden | Visible |
| Upload photo | Visible* | Visible* | Visible* | Hidden | Visible* |
| Add note | Visible* | Visible* | Visible* | Hidden | Visible* |

*Hidden when status is completed/cancelled.

**Business rules to verify:**
- BR-044: Work order completion can auto-resolve linked alert
- SM-002: Work order state transitions with guards (assigned->in_progress requires technician)

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Status: open -- assign visible
- [ ] Status: assigned -- start work visible (for technician)
- [ ] Status: in_progress -- complete visible (for technician)
- [ ] Status: completed -- upload/note hidden, no action buttons
- [ ] Status: cancelled -- upload/note hidden, no action buttons
- [ ] Photo upload flow
- [ ] Note add flow
- [ ] Timeline shows status history

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 3.9 Temperature Verification (`/sites/{site}/verifications`)

**How to get here:**
- From Site Detail: verification link
- Direct URL

**Content (verify these exist):**
- [ ] Verification form
- [ ] Checklist items
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Submit verification | POST | Same page or site detail |

**Role differences:** All authenticated users.

**Business rules to verify:**
- BR-038: Compliance tracking

**Screen states to test:**
- [ ] Default empty form
- [ ] Form validation
- [ ] Submitted state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 4: Analytics & Reports

---

### 4.1 Alert Tuning (`/analytics/alerts`)

**How to get here:**
- Sidebar: Analytics > Alert Tuning
- Direct URL

**Content (verify these exist):**
- [ ] 4 KPI cards: total alerts, noise ratio, MTTR, auto-resolved %
- [ ] Noisiest Rules table: rule name, site, fire count, false positive %, "Tune" link
- [ ] Trend chart: CSS-rendered bar chart (alerts over time)
- [ ] Resolution Breakdown: horizontal bars by resolution type
- [ ] Suggested Tuning cards: AI-generated recommendations per rule

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Site filter | Re-fetches all data | Same page |
| Period toggle (30d/90d) | Re-fetches all data | Same page |
| "Tune" link | Navigate | `/sites/{site_id}/rules/{rule_id}` (alert rule detail) |

**Role differences:** None.

**Business rules to verify:**
- BR-012: Cooldown helps reduce noise -- verify noise ratio metric
- BR-013: Auto-resolution rate visible in auto-resolved %

**Screen states to test:**
- [ ] EmptyState when no alerts exist in the period
- [ ] Populated with KPIs, table, chart, breakdown

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.2 Performance Analytics (`/analytics/performance`)

**How to get here:**
- Sidebar: Analytics > Performance
- Direct URL

**Content (verify these exist):**
- [ ] 4 KPI cards with target indicators: uptime, MTTR, compliance, device health
- [ ] Trend chart: CSS-rendered bar chart
- [ ] Site Breakdown table: site name, uptime %, alerts, MTTR, compliance score
- [ ] `PerformanceSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle (30d/90d/365d) | Re-fetches all data | Same page |
| Row click (Site Breakdown) | Navigate | `/sites/{id}` |

**Role differences:** None.

**Screen states to test:**
- [ ] `PerformanceSkeleton` on load
- [ ] Empty table state
- [ ] Populated with KPIs, chart, breakdown table

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.3 Site Comparison (`/sites/compare`)

**How to get here:**
- Sidebar: Analytics > Site Comparison
- Direct URL

**Content (verify these exist):**
- [ ] Summary cards: best site, average value, worst site
- [ ] Ranking table: rank circle, site name, metric value, vs-average badge (above/below)
- [ ] Metric select dropdown
- [ ] Period toggle (30d / 90d / 365d)
- [ ] `SiteComparisonSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Metric select | Re-fetches rankings | Same page |
| Period toggle | Re-fetches rankings | Same page |
| Row click | Navigate | `/sites/{id}` |

**Role differences:** None.

**Screen states to test:**
- [ ] `SiteComparisonSkeleton` on load
- [ ] Empty state: shown when organization has fewer than 2 sites
- [ ] Populated: ranking table with badges

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.4 Reports Index (`/reports`)

**How to get here:**
- Sidebar: Reports
- Direct URL

**Content (verify these exist):**
- [ ] 3 report type cards:
  - [ ] Temperature Report: site select, date range, Generate button
  - [ ] Energy Report: site select, date range, Generate button
  - [ ] Morning Summary: site select, Generate button (no date range)
- [ ] `ReportsIndexSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Generate Temperature | Navigate | `/sites/{id}/reports/temperature?from=&to=` |
| Generate Energy | Navigate | `/sites/{id}/reports/energy?from=&to=` |
| Generate Summary | Navigate | `/sites/{id}/reports/summary` |

**Role differences:** None.

**Screen states to test:**
- [ ] `ReportsIndexSkeleton` on load
- [ ] No sites: informational message
- [ ] All 3 cards render with controls

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.5 Temperature Report (`/sites/{site}/reports/temperature`)

**How to get here:**
- From Reports Index: Generate Temperature
- From Site Detail: Temperature Report link
- Direct URL with `from` and `to` query params

**Content (verify these exist):**
- [ ] Summary cards: compliance %, excursion count, etc.
- [ ] Compliance by Zone: horizontal bar chart
- [ ] Per-zone sections: trend line chart + device table (device name, min, max, avg, excursions)
- [ ] Export PDF button
- [ ] Date range controls + Generate button
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Export PDF | Triggers PDF download | New tab / download |
| Date range + Generate | Re-fetches report | Same page |

**Role differences:** None.

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Populated report with charts and tables
- [ ] Date range change re-generates report

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.6 Energy Report (`/sites/{site}/reports/energy`)

**How to get here:**
- From Reports Index: Generate Energy
- Direct URL with `from` and `to` query params

**Content (verify these exist):**
- [ ] 4 KPI cards: total kWh, total cost, avg daily, peak day
- [ ] Daily Consumption area chart (dual axis: kWh + cost)
- [ ] Per-device table: device name, total kWh, avg daily, peak
- [ ] Daily Totals table: date, kWh, cost
- [ ] Export PDF button
- [ ] **BUG:** Second Export PDF button rendered (duplicate)
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Export PDF | Triggers PDF download | New tab / download |
| Date range + Generate | Re-fetches report | Same page |

**Role differences:** None.

**Business rules to verify:**
- BR-041: Night waste detection -- energy consumption between 22:00-06:00 flagged as waste

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Populated report
- [ ] Verify BUG: duplicate Export PDF button

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.7 Morning Summary (`/sites/{site}/reports/summary`)

**How to get here:**
- From Reports Index: Generate Summary
- From Site Detail: Summary Report link
- Direct URL

**Content (verify these exist):**
- [ ] Fleet health score
- [ ] 4 device stat cards: total, online, offline, critical battery
- [ ] 2 alert stat cards: active, unacknowledged
- [ ] Zone status cards (per-zone current status)
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
None -- fully read-only.

**Role differences:** None.

**Business rules to verify:**
- BR-034: Morning summary sent at each site's `opening_hour` (timezone-aware)
- BR-037: Summaries deliver via push + email

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Populated summary

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.8 Device Inventory Report (`/sites/{site}/reports/inventory`)

**How to get here:**
- From Reports Index or Site Detail
- Direct URL

**Content (verify these exist):**
- [ ] Device inventory table
- [ ] Summary statistics

**Actions -> Destinations:**
Read-only report.

**Role differences:** None.

**Screen states to test:**
- [ ] Populated inventory
- [ ] Empty inventory

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.9 Site Timeline (`/sites/{site}/timeline`)

**How to get here:**
- From Site Detail: navigation
- Direct URL

**Content (verify these exist):**
- [ ] Header with total event count
- [ ] Filter bar: date range picker, event type select, zone select
- [ ] Timeline: events grouped by hour, each with type icon, description, and optional "View details" link
- [ ] `SiteTimelineSkeleton` loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Date filter (DateRangePicker) | Re-fetches events | Same page |
| Type filter (Select) | Re-fetches events | Same page |
| Zone filter (Select) | Re-fetches events | Same page |
| "View details" link on event | Navigate | Varies (alert, WO, etc.) |

**Role differences:** None.

**Screen states to test:**
- [ ] `SiteTimelineSkeleton` on load
- [ ] Empty state when no events match filters
- [ ] Populated timeline with grouped events

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 4.10 Site Audit (`/sites/{site}/audit`)

**How to get here:**
- From Site Detail: navigation
- Direct URL

**Content (verify these exist):**
- [ ] 5 summary cards: compliance score, excursions, corrective actions, calibrations, gaps
- [ ] Temperature Excursions table: date, zone, device, duration, max deviation
- [ ] Corrective Actions table: date, action taken, user, status
- [ ] Sensor Calibrations table: device, last calibrated, next due, status
- [ ] Monitoring Gaps table (conditional -- only shown if gaps exist)
- [ ] Period toggle: 90d / 180d / 365d
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle (90d/180d/365d) | Re-fetches all data | Same page |
| Excursion row click | Navigate | `/alerts/{id}` |

**Role differences:** None.

**Business rules to verify:**
- BR-038: Compliance reminders and tracking
- SM-006: Compliance event lifecycle

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Populated with all tables
- [ ] Monitoring Gaps table: visible only when gaps exist
- [ ] Period change re-fetches data

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 5: Command Center (Astrea roles only)

> **Test as:** super_admin first. All CC pages restricted to Astrea roles (SA, SUP, AM, TECH).

---

### 5.1 CC Dashboard (`/command-center`)

**How to get here:**
- Sidebar: Command Center
- Direct URL

**Content (verify these exist):**
- [ ] 6 KPI cards: total orgs, total sites, total devices, active alerts, open WOs, fleet health
- [ ] Organization table: name, sites, devices, alerts, health score
- [ ] Outage declaration dialog
- [ ] Delivery health section (notification delivery stats)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Declare Outage | Opens dialog -> POST | Same page (outage declared, banner appears) |
| Org row click | Navigate | `/command-center/organizations/{org}` |

**Role differences:**
| Element | SA | SUP | AM | TECH | OA | SM | SV |
|---|---|---|---|---|---|---|---|
| Entire page | Visible | Visible | Visible | Visible | Hidden (403) | Hidden (403) | Hidden (403) |

**Business rules to verify:**
- BR-032: Command Center restricted to Astrea roles (hardcoded)

**Screen states to test:**
- [ ] Normal state (no outage)
- [ ] Active outage banner state
- [ ] Populated org table
- [ ] Client role gets 403

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.2 CC Alerts (`/command-center/alerts`)

**How to get here:**
- From CC Dashboard: sub-navigation
- Direct URL

**Content (verify these exist):**
- [ ] Alert table: severity, alert name, organization, site, device, status, time
- [ ] Pagination
- [ ] **Note:** Read-only -- no acknowledge/resolve/dismiss actions from CC level

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| (Read-only) | No drill-down actions | N/A |

**Role differences:** Astrea roles only.

**Screen states to test:**
- [ ] Empty state
- [ ] Populated table with cross-org alerts

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.3 CC Devices (`/command-center/devices`)

**How to get here:**
- From CC Dashboard: sub-navigation
- Direct URL

**Content (verify these exist):**
- [ ] Stats bar: total devices, online, offline, critical
- [ ] Device table: name, model, organization, site, status, battery, last seen
- [ ] **(gap)** No row click action -- cannot drill down to device

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| **(gap)** No actions | Read-only, no drill-down | N/A |

**Role differences:** Astrea roles only.

**Screen states to test:**
- [ ] Empty state
- [ ] Populated table with cross-org devices
- [ ] Verify BUG: rows are not clickable

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.4 CC Dispatch (`/command-center/dispatch`)

**How to get here:**
- From CC Dashboard: sub-navigation
- Direct URL

**Content (verify these exist):**
- [ ] Left Panel: Work order list (title, priority, status, site, assigned technician)
- [ ] Left Panel: Technician assignment select per WO
- [ ] Right Panel: Leaflet map with site markers and technician locations

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Assign Technician (per WO) | PATCH work order | Same page |
| WO click | Highlights on map / expands detail | Same page |

**Role differences:** Astrea roles only.

**Screen states to test:**
- [ ] Empty WO list
- [ ] Map loading state
- [ ] Populated list + map markers
- [ ] Assign technician flow

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.5 CC Revenue (`/command-center/revenue`)

**How to get here:**
- From CC Dashboard: sub-navigation
- Direct URL

**Content (verify these exist):**
- [ ] MRR charts (monthly recurring revenue trends)
- [ ] Organization table: name, plan, MRR, device count, status
- [ ] Period selection

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Org row click | Drill-down | CC Org Show or inline detail |
| Period select | Re-fetches data | Same page |

**Role differences:** Astrea roles only.

**Business rules to verify:**
- BR-021 - BR-026: Subscription and pricing rules reflected in MRR

**Screen states to test:**
- [ ] Empty when no billing data
- [ ] Populated with charts and table

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.6 CC Work Orders (`/command-center/work-orders`)

**How to get here:**
- From CC Dashboard: sub-navigation
- Direct URL

**Content (verify these exist):**
- [ ] Table: title, type, priority, status, organization, site, assigned technician, created date

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Row click | Navigate | `/work-orders/{id}` (main app) |

**Role differences:** Astrea roles only.

**Screen states to test:**
- [ ] Empty state
- [ ] Populated table with cross-org work orders

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.7 CC Org Detail (`/command-center/organizations/{org}`)

**How to get here:**
- From CC Dashboard: org row click
- From Partner Portal: org row click

**Content (verify these exist):**
- [ ] Organization header: name, segment, plan
- [ ] Main column: Sites table (name, status, device count, health score)
- [ ] Sidebar: Active alerts list
- [ ] Sidebar: Recent activity feed

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Site row click | Navigate | `/sites/{id}` |

**Role differences:** Astrea roles only.

**Screen states to test:**
- [ ] Empty sites
- [ ] Empty alerts
- [ ] Empty activity
- [ ] Populated state

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 5.8 Partner Portal (`/partner`)

**How to get here:**
- Sidebar: Partner Portal
- Direct URL

**Content (verify these exist):**
- [ ] Organization table: name, segment, sites count, devices count, status, MRR
- [ ] "Create Organization" button (opens dialog)
- [ ] Create dialog: name, segment select, plan select
- [ ] **Design inconsistency:** Create dialog uses "Creating..." text instead of Spinner component

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Create Organization | Opens dialog -> POST | Same page (new org in table) |
| Org row click | Navigate | `/command-center/organizations/{org}` |

**Role differences:**
| Element | SA | SUP | AM | TECH | OA | SM | SV |
|---|---|---|---|---|---|---|---|
| Entire page | Visible | Hidden (403) | Hidden (403) | Hidden (403) | Hidden (403) | Hidden (403) | Hidden (403) |

super_admin only -- other Astrea roles cannot access.

**Business rules to verify:**
- BR-032: Partner Portal restricted to super_admin role (hardcoded)
- BR-049: Organization creation auto-generates subscription with segment-appropriate base_fee

**Screen states to test:**
- [ ] Empty table
- [ ] Populated table
- [ ] Create dialog processing state (note: uses text, not Spinner)
- [ ] Non-SA role gets 403

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 6: Global Features

---

### 6.1 Global Search (Cmd+K)

**How to get here:**
- Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- Search icon in header

**Content (verify these exist):**
- [ ] Search input field
- [ ] Results grouped by type (sites, devices, alerts, etc.)
- [ ] Keyboard navigation support

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Type query | Searches across entities | Same dialog (results appear) |
| Click result | Navigate | Respective detail page |
| Escape key | Close | Dismisses search |

**Role differences:** Results scoped to user's accessible entities.

**Screen states to test:**
- [ ] Empty state (no query)
- [ ] Results found
- [ ] No results
- [ ] Keyboard navigation works

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 6.2 Org Switcher

**How to get here:**
- Header: org switcher dropdown (Astrea roles only)

**Content (verify these exist):**
- [ ] Current org name displayed
- [ ] Dropdown with list of organizations
- [ ] Search within dropdown (if many orgs)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Select different org | Sets session org | Same page (data reloads for new org) |

**Role differences:** Only visible to Astrea roles (SA/SUP/AM/TECH).

**Business rules to verify:**
- BR-031: super_admin can switch organizations via session or X-Organization-Id header

**Screen states to test:**
- [ ] Dropdown opens with org list
- [ ] Switch org: data refreshes
- [ ] Client roles: switcher hidden

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 6.3 Language Switcher

**How to get here:**
- Header or settings area

**Content (verify these exist):**
- [ ] Language toggle: English / Spanish (en/es)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Switch language | Persists locale | Same page (labels reload in new language) |

**Screen states to test:**
- [ ] Switch to Spanish: verify UI labels change
- [ ] Switch back to English: verify labels revert
- [ ] Persists across page navigation

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 6.4 Theme Toggle

**How to get here:**
- Header: appearance toggle
- Settings > Appearance page

**Content (verify these exist):**
- [ ] Theme options: light, dark, system

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Select theme | Persists to localStorage/cookie | Same page (theme applies immediately) |

**Screen states to test:**
- [ ] Light mode
- [ ] Dark mode
- [ ] System mode (follows OS preference)
- [ ] Persists across sessions

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 6.5 Notifications Page (`/notifications`)

**How to get here:**
- Header: notification bell icon
- Sidebar (if present)
- Direct URL

**Content (verify these exist):**
- [ ] Header with total/unread counts
- [ ] "Mark all read" button
- [ ] "Delete read" button
- [ ] Filter: all / unread / read
- [ ] Notification list grouped by date
- [ ] Per-notification: mark read/unread button, delete button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Mark all read | PATCH batch | Same page (all marked read) |
| Delete read | DELETE batch | Same page (read notifications removed) |
| Mark single read/unread | PATCH per-notification | Same page |
| Delete single | DELETE | Same page |
| Notification click | Navigate | Linked resource |
| Pagination | Loads next page | Same page |

**Role differences:** None.

**Screen states to test:**
- [ ] Empty: all notifications (different message)
- [ ] Empty: unread filter
- [ ] Empty: read filter
- [ ] Populated: grouped by date
- [ ] **(gap)** Uses `window.confirm` for delete instead of ConfirmationDialog

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 6.6 Activity Log (`/activity-log`)

**How to get here:**
- Sidebar: Activity Log
- Direct URL

**Content (verify these exist):**
- [ ] Header with total activity count
- [ ] Event type filter
- [ ] Timeline grouped by date, each entry with expandable change diff
- [ ] **(gap)** No skeleton loading state

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Event type filter | Re-fetches activities | Same page |
| Refresh button | Re-fetches activities | Same page |
| Load more | Appends next page | Same page |

**Role differences:** None.

**Screen states to test:**
- [ ] **(gap)** No skeleton
- [ ] Custom EmptyState when no activities match filter
- [ ] Populated timeline with expandable diffs
- [ ] **(gap)** Uses `window.confirm` instead of ConfirmationDialog

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 7: Account (from avatar dropdown)

---

### 7.1 Profile (`/settings/profile`)

**How to get here:**
- Header: avatar dropdown > Profile
- Sidebar: Settings > Profile
- Direct URL

**Content (verify these exist):**
- [ ] Section 1 -- Personal Info: name, email, phone fields
- [ ] Section 2 -- Quiet Hours: enabled toggle, start time, end time
- [ ] Section 3 -- Notification Preferences: channel toggles (email, SMS, push, WhatsApp) per notification type
- [ ] Save button per section

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Save (each section) | PATCH `/user/profile-information` | Same page (toast) |

**Role differences:** None.

**Screen states to test:**
- [ ] Pristine form with current values
- [ ] Dirty form
- [ ] Submitting state
- [ ] Validation errors (invalid email, etc.)

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 7.2 Security / Password (`/settings/password`)

**How to get here:**
- Sidebar: Settings > Password
- Direct URL

**Content (verify these exist):**
- [ ] Current password field
- [ ] New password field
- [ ] Password confirmation field
- [ ] Submit button

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Update password | PUT `/user/password` (Fortify) | Same page (toast) |

**Role differences:** None.

**Screen states to test:**
- [ ] Pristine form
- [ ] Validation errors (wrong current password, weak new password, mismatch)
- [ ] Success toast

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 7.3 Appearance (`/settings/appearance`)

**How to get here:**
- Sidebar: Settings > Appearance
- Direct URL

**Content (verify these exist):**
- [ ] AppearanceTabs component
- [ ] Theme options: light, dark, system (clickable cards)
- [ ] Selected state indicator on active theme

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Set theme (card click) | Persists to localStorage/cookie | Same page (theme applies) |

**Role differences:** None.

**Screen states to test:**
- [ ] Current theme highlighted
- [ ] Theme switch applies immediately

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 7.4 Two-Factor Setup (`/settings/two-factor`)

**How to get here:**
- Sidebar: Settings > Two-Factor Authentication
- Direct URL

**Content (verify these exist):**
- [ ] Status card: enabled/disabled indicator
- [ ] Enable flow: QR code display -> TOTP code confirmation -> recovery codes display
- [ ] Disable flow: confirmation -> TOTP code entry -> disabled
- [ ] Recovery codes: view/regenerate buttons

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Enable 2FA | POST -> shows QR modal | Same page (modal) |
| Confirm setup | POST confirm (with TOTP code) | Same page (enabled state) |
| Disable 2FA | DELETE | Same page (disabled state) |
| View recovery codes | GET | Same page (codes displayed) |
| Regenerate codes | POST | Same page (new codes) |

**Role differences:** None.

**Screen states to test:**
- [ ] Disabled state: enable button visible
- [ ] Setup-in-progress: QR code displayed, code input
- [ ] Enabled state: disable button, view/regenerate codes
- [ ] Recovery codes display

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 8: Billing (Deactivated -- Quick Check)

> **Note:** Billing module is currently deactivated. Verify graceful deactivation only.

- [ ] `/settings/billing` loads without errors (may show empty or deactivated state)
- [ ] `/settings/billing/profiles` loads without errors
- [ ] Sidebar still shows billing link (or is correctly hidden when deactivated)
- [ ] No broken links to billing from other pages

---

## Phase 9: Platform

---

### 9.1 Status Page (`/status`)

**How to get here:**
- Direct URL: `http://iot-hub.test/status`
- Public (no auth required)

**Content (verify these exist):**
- [ ] Platform status indicators
- [ ] Active outage information (if any)

**Actions -> Destinations:**
None -- read-only public page.

**Screen states to test:**
- [ ] Normal state (all systems operational)
- [ ] Outage state (when outage declared from CC)
- [ ] Accessible without authentication

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 9.2 Health Check (`/health`)

**How to get here:**
- Direct URL: `http://iot-hub.test/health`

**Content (verify these exist):**
- [ ] Health check response (JSON or status page)

**Screen states to test:**
- [ ] Returns 200 with health data
- [ ] Accessible without authentication

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Phase 10: Module Dashboards

---

### 10.1 IAQ Dashboard (`/modules/iaq`)

**How to get here:**
- Sidebar: Modules > IAQ (when module enabled for current site)
- Direct URL

**Content (verify these exist):**
- [ ] IAQ score ring (overall air quality index)
- [ ] Zone cards: zone name, current AQI score, primary pollutant
- [ ] Trend chart with period toggle (Recharts)

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle | Re-fetches chart data | Same page |
| Zone card click | Navigate (if linked) | Zone Detail |

**Role differences:** None (module must be enabled for site).

**Known bugs:**
- **BUG:** Uses `window.location.search` for reading query params -- not SSR-safe

**Business rules to verify:**
- BR-054: IAQ zone scoring -- composite air quality scores from AM307 sensor data

**Screen states to test:**
- [ ] Module enabled: dashboard renders
- [ ] Module disabled: graceful handling (redirect or message)
- [ ] Period toggle changes chart data

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

### 10.2 Industrial Dashboard (`/modules/industrial`)

**How to get here:**
- Sidebar: Modules > Industrial (when module enabled for current site)
- Direct URL

**Content (verify these exist):**
- [ ] KPI cards (OEE, uptime, energy efficiency, etc.)
- [ ] Equipment cards: machine name, status, current metrics
- [ ] Compressor health section
- [ ] Trend chart with period toggle

**Actions -> Destinations:**
| Click/Action | What happens | Destination |
|---|---|---|
| Period toggle | Re-fetches chart data | Same page |
| Equipment card click | Navigate (if linked) | Device detail |

**Role differences:** None (module must be enabled for site).

**Known bugs:**
- **BUG:** KPICard uses dynamic Tailwind classes (`text-${color}-500`) -- will not be included in CSS purge

**Business rules to verify:**
- BR-052: Compressor duty cycle analytics

**Screen states to test:**
- [ ] Module enabled: dashboard renders
- [ ] Module disabled: graceful handling
- [ ] Period toggle changes chart data

**Your notes:**
>
>

**Issues found:**
- [ ]
- [ ]

---

## Appendix A: Role-Based Access Summary

### Page Access Matrix

| Page | SA | SUP | AM | TECH | OA | SM | SV |
|------|:--:|:---:|:--:|:----:|:--:|:--:|:--:|
| **Auth Pages** | | | | | | | |
| Login/Register/Password Reset | Pre-auth | Pre-auth | Pre-auth | Pre-auth | Pre-auth | Pre-auth | Pre-auth |
| Verify Email/Confirm Password | Auth | Auth | Auth | Auth | Auth | Auth | Auth |
| Two-Factor Challenge | Auth | Auth | Auth | Auth | Auth | Auth | Auth |
| Privacy Accept | Auth | Auth | Auth | Auth | Auth | Auth | Auth |
| **Core** | | | | | | | |
| Dashboard | Y | Y | Y | Y | Y | Y | Y |
| Sites Index | Y | Y | Y | Y | Y | Y | Y |
| Site Show | Y | Y | Y | Y | Y | Y | Y |
| Zone Detail | Y | Y | Y | Y | Y | Y | Y |
| Alerts Index | Y | Y | Y | Y | Y | Y | Y |
| Alert Show | Y | Y | Y | Y | Y | Y | Y |
| Devices Index | Y | Y | Y | Y | Y | Y | Y |
| Device Show | Y | Y | Y | Y | Y | Y | Y |
| Work Orders Index | Y | Y | Y | Y | Y | Y | Y |
| Work Order Show | Y | Y | Y | Y | Y | Y | Y |
| Activity Log | Y | Y | Y | Y | Y | Y | Y |
| Notifications | Y | Y | Y | Y | Y | Y | Y |
| **Analytics** | | | | | | | |
| Alert Tuning | Y | Y | Y | Y | Y | Y | Y |
| Performance | Y | Y | Y | Y | Y | Y | Y |
| Site Comparison | Y | Y | Y | Y | Y | Y | Y |
| **Reports** | | | | | | | |
| Reports Index | Y | Y | Y | Y | Y | Y | Y |
| Temperature Report | Y | Y | Y | Y | Y | Y | Y |
| Energy Report | Y | Y | Y | Y | Y | Y | Y |
| Morning Summary | Y | Y | Y | Y | Y | Y | Y |
| Device Inventory | Y | Y | Y | Y | Y | Y | Y |
| Site Timeline | Y | Y | Y | Y | Y | Y | Y |
| Site Audit | Y | Y | Y | Y | Y | Y | Y |
| Temp Verification | Y | Y | Y | Y | Y | Y | Y |
| **Settings** | | | | | | | |
| Profile | Y | Y | Y | Y | Y | Y | Y |
| Password | Y | Y | Y | Y | Y | Y | Y |
| Appearance | Y | Y | Y | Y | Y | Y | Y |
| Two-Factor | Y | Y | Y | Y | Y | Y | Y |
| Organization | Y | - | - | - | Y | - | - |
| Sites Settings | Y | - | - | - | Y | - | - |
| Onboarding Wizard | Y | - | - | - | Y | - | - |
| Users | Y | - | - | - | Y | - | - |
| Gateways | Y | - | - | - | Y | Y | - |
| Devices (site-scoped) | Y | - | - | - | Y | Y | - |
| Alert Rules | Y | - | - | - | Y | Y | - |
| Escalation Chains | Y | - | - | - | Y | Y | - |
| Compliance | Y | - | - | - | Y | - | - |
| Maintenance Windows | Y | - | - | - | Y | Y | - |
| Report Schedules | Y | Y | Y | - | Y | Y | - |
| Site Templates | Y | Y | Y | Y | Y | Y | Y |
| Modules | Y | Y | Y | Y | Y | Y | Y |
| Recipes | Y | Y | Y | Y | Y | Y | Y |
| Export Data | Y | Y | Y | Y | Y | Y | Y |
| Integrations | Y | Y | Y | Y | Y | Y | Y |
| API Keys | Y | Y | Y | Y | Y | Y | Y |
| Billing | Y | - | - | - | Y | - | - |
| **Command Center** | | | | | | | |
| CC Dashboard | Y | Y | Y | Y | - | - | - |
| CC Alerts | Y | Y | Y | Y | - | - | - |
| CC Devices | Y | Y | Y | Y | - | - | - |
| CC Dispatch | Y | Y | Y | Y | - | - | - |
| CC Revenue | Y | Y | Y | Y | - | - | - |
| CC Work Orders | Y | Y | Y | Y | - | - | - |
| CC Org Show | Y | Y | Y | Y | - | - | - |
| Partner Portal | Y | - | - | - | - | - | - |
| **Module Dashboards** | | | | | | | |
| IAQ Dashboard | Y | Y | Y | Y | Y | Y | Y |
| Industrial Dashboard | Y | Y | Y | Y | Y | Y | Y |
| **Platform** | | | | | | | |
| Status Page | Public | Public | Public | Public | Public | Public | Public |
| Health Check | Public | Public | Public | Public | Public | Public | Public |

**Legend:** Y = Full access, - = No access / 403, Public = No auth required

### Key Action Permissions

| Action | Required Permission | Roles That Have It |
|--------|--------------------|--------------------|
| Acknowledge alert | `acknowledge alerts` | SA, SUP, AM, TECH, OA, SM |
| Dismiss alert | `manage alert rules` | SA, OA, SM |
| Log corrective action | `log corrective actions` | SA, OA, SM, TECH |
| Verify corrective action | `verify corrective actions` | SA, OA, SM, TECH (different user) |
| Manage devices | `manage devices` | SA, OA, SM |
| Manage sites | `manage sites` | SA, OA |
| Manage users | `manage users` | SA, OA |
| Manage work orders | `manage work orders` | SA, OA, SM |
| Complete work orders | `complete work orders` | SA, TECH |
| Manage org settings | `manage org settings` | SA, OA |
| Manage alert rules | `manage alert rules` | SA, OA, SM |
| Manage maintenance windows | `manage maintenance windows` | SA, OA, SM |
| Manage report schedules | `manage report schedules` | SA, OA, SM |

---

## Appendix B: Known Bugs & Gaps Summary

### Confirmed Bugs (from WORKFLOW_UX_DESIGN.md Section 8.4)

| # | Page | Bug | Severity |
|---|------|-----|----------|
| 1 | Energy Report | Duplicate "Export PDF" button rendered | Low |
| 2 | Alert Rule Show | No edit form -- edit button navigates here but only shows read-only detail | Medium |
| 3 | Billing Profiles | No edit/delete for existing profiles -- can only create | Medium |
| 4 | IAQ Dashboard | Uses `window.location.search` -- not SSR-safe | Medium |
| 5 | Industrial Dashboard | KPICard uses dynamic Tailwind classes (`text-${color}-500`) -- won't survive CSS purge | Medium |
| 6 | CC Devices | No row click action -- cannot drill down to individual device | Low |
| 7 | Welcome page | Orphaned Laravel boilerplate -- unreachable, should be deleted | Low |

### Permission Gaps

| Page | Action | Issue |
|------|--------|-------|
| Modules toggle | Toggle module on/off | No permission gate |
| Maintenance Windows | Suppress alerts toggle | No permission gate |
| Report Schedules | Toggle enable + Delete | No permission gate |
| Site Templates | Delete template | No permission gate |
| Export Data | All actions | No permission checks |
| API Keys | Delete | No confirmation dialog |
| Notifications | Delete actions | Uses `window.confirm` |
| Activity Log | Destructive actions | Uses `window.confirm` |

### Missing Skeleton/Loading States

**Priority 1 (high-traffic):** Sites Index, Devices Index, Alert Show, Work Order Show
**Priority 2 (moderate):** Zone Detail, Site Audit, Activity Log, all report pages
**Priority 3 (lower):** All CC pages, all module dashboards, most settings pages

### Design Inconsistencies

| # | Issue | Location |
|---|-------|----------|
| 1 | `LoaderCircle` instead of `Spinner` | Forgot Password form |
| 2 | "Creating..." text instead of `Spinner` | Partner Portal create dialog |
| 3 | Only 1 recipient captured | Report Schedules (model supports array) |
| 4 | Mixed form patterns | Various settings pages |

---

> **Document generated:** 2026-03-25
> **Source:** WORKFLOW_UX_DESIGN.md (67 pages audited) + SYSTEM_BEHAVIOR_SPEC.md (54 business rules)
> **Coverage:** 72 frontend pages across 10 test phases
> **Cross-references:** SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md, CLAUDE.md
