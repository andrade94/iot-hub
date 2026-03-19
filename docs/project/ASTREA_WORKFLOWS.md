# Astrea Platform Workflows

> 12 end-to-end workflows with file:method references. Generated from source code.

## Summary

| # | Workflow | Entry Point | Primary Actor |
|---|---|---|---|
| 1 | Client Onboarding | `PartnerController::store` | **super_admin** |
| 2 | Sensor Data Pipeline | `MqttListener::handleUplink` | System |
| 3 | Alert Lifecycle | `RuleEvaluator::evaluate` | System |
| 4 | Work Order Lifecycle | `WorkOrderController::store` | **site_manager** / System |
| 5 | Morning Summaries | `SendMorningSummary` job | System (scheduled) |
| 6 | Reporting | `ReportController::temperature` | **site_viewer+** |
| 7 | Billing | `PartnerController::store` | **super_admin** / **org_admin** |
| 8 | Compliance | `ComplianceCalendarController::store` | **org_admin** |
| 9 | User Management | `UserManagementController::store` | **org_admin** |
| 10 | Integration Export | `SapExportService` / `ContpaqExportService` | **org_admin** |
| 11 | Module System | `ModuleController::toggle` | **org_admin** |
| 12 | White-Label Branding | `OrganizationSettingsController::update` | **org_admin** |

---

## 1. Client Onboarding

**Actors:** **super_admin**, **org_admin**

1. **super_admin** creates organization with segment + plan
   - `PartnerController::store` validates name, slug, segment, plan
   - `Organization::create()` (side effect: creates DB record)
2. Auto-create billing profile with placeholder RFC
   - `BillingProfile::create()` with `is_default=true`
3. Auto-create subscription with $500 MXN base fee
   - `SubscriptionService::createSubscription()` -- status=active, started_at=now
4. **super_admin** creates org_admin user (via `UserManagementController::store`)
   - `User::create()` with org_id, `assignRole('org_admin')`
5. **org_admin** creates site(s) under the org
   - `SiteSettingsController` -- site record with timezone, opening_hour, address
6. **org_admin** launches onboarding wizard
   - `SiteOnboardingController::show` -- determines current step from site state

7. **Step 1 -- Gateway:** `SiteOnboardingController::storeGateway` -> `DeviceProvisioner::provisionGateway()` (side effect: ChirpStack API call)
8. **Step 2 -- Devices:** `SiteOnboardingController::storeDevices` -> `Device::create()` status=pending -> `DeviceProvisioner::provisionDevice()` (side effect: auto-applies recipes via `RecipeApplicationService::applyModuleRecipes`)
9. **Step 3 -- Floor Plans:** `FloorPlanController` -- file upload + device placement (optional)
10. **Step 4 -- Modules:** `SiteOnboardingController::activateModules` -> `RecipeApplicationService::applyModuleRecipes()` (side effect: AlertRules auto-created for matching sensor models)
11. **Step 5 -- Escalation:** `getStepStatuses` checks `EscalationChain::where('site_id')`
12. **Step 6 -- Complete:** `SiteOnboardingController::complete` sets `site.status='active'` (warns if missing gateway/devices/modules/escalation)

---

## 2. Sensor Data Pipeline

**Actors:** System (automated)

1. LoRaWAN sensor transmits data to ChirpStack Cloud
2. ChirpStack publishes MQTT uplink message
   - `MqttListener::handleUplink` -- extracts devEui from deviceInfo
3. Look up device by dev_eui
   - `Device::where('dev_eui', $devEui)` -- discards if not found
4. Decode base64 payload to hex, extract RSSI
   - `MqttListener` -- base64_decode, bin2hex, rxInfo[0].rssi
5. Dispatch processing job
   - `ProcessSensorReading::dispatch(deviceId, hexPayload, rssi)` (3 tries, 10s backoff)
6. Decode hex payload by device model
   - `DecoderFactory::resolve()` -- maps model to decoder class
   - `MilesightDecoder::decode(model, hex)` -- returns metric=>value pairs
7. Dual-write readings
   - `ReadingStorageService::store()` -- TimescaleDB `SensorReading` rows + Redis hash `device:{id}:latest`
   - (side effect: Redis failure is non-fatal)
8. Update device metadata
   - `ReadingStorageService::store()` -- sets last_reading_at, rssi, battery_pct
   - (side effect: auto-activates pending/provisioned devices to active)
9. Dispatch alert evaluation
   - `EvaluateAlertRules::dispatch(device, readings)` (1 try)
10. Broadcast to live dashboards
    - `broadcast(new SensorReadingReceived($device, $readings))` via Reverb
    - (side effect: broadcast failure does not fail pipeline)

---

## 3. Alert Lifecycle

**Actors:** System, **technician**, **site_manager**

1. **Evaluate rules** for the device's site
   - `RuleEvaluator::evaluate(device, readings)` -- queries active AlertRules matching site_id + device_id
2. Check defrost suppression (temperature metrics only)
   - `DefrostDetector::shouldSuppressAlert()` -- checks current time against defrost windows +/- 15min buffer
   - (note: not yet wired into RuleEvaluator)
3. Check condition: above/below/equals threshold
   - `RuleEvaluator::checkCondition()` -- supports above, below, equals (0.001 tolerance)
4. Track sustained breach in Redis
   - Key: `alert_rule_state:{rule_id}:{device_id}:{metric}` (3600s TTL)
   - Increments reading_count, checks elapsed >= duration_minutes
5. Check cooldown period
   - `RuleEvaluator::isInCooldown()` -- Redis key `alert_cooldown:{rule_id}:{device_id}`
   - (side effect: falls back to DB query if Redis unavailable)
6. Create alert with data snapshot
   - `RuleEvaluator::triggerAlert()` -- Alert record with metric, value, threshold, condition, device context
   - Status: `active`, triggered_at=now
7. Route alert by severity
   - `AlertRouter::route()` -- loads EscalationChain for site, ordered by level
   - Critical: levels 1,2,3 | High: 1,2 | Medium/Low: 1 only
8. Send Level 1 notification immediately
   - `SendAlertNotification::dispatch(alert, contact, channel)` (3 tries, 30s backoff)
   - Channels: whatsapp (`TwilioService::sendAlert`), push (`PushNotificationService::sendToUser`), email (stub)
9. Schedule higher-level escalations with delay
   - `EscalateAlert::dispatch(alert, level)->delay(cumulative_minutes)`
   - `EscalationService::escalate()` -- skips if alert already acknowledged/resolved/dismissed
10. Broadcast alert via Reverb (always, regardless of escalation chain)
    - `AlertRouter::broadcastAlert()` -- `broadcast(new AlertTriggered($alert))`
11. Create audit trail
    - `SendAlertNotification` creates `AlertNotification` record: status sent->delivered/failed
12. **Acknowledge** (user or WhatsApp ACK reply)
    - `Alert::acknowledge($userId)` -- sets acknowledged_at, status=acknowledged
    - WhatsApp: `WhatsAppWebhookController` matches phone, acknowledges most recent active alert
13. **Resolve** (manual, auto, or work order)
    - Auto: `RuleEvaluator::handleNormal()` -- 2 consecutive normal readings -> resolve with type=auto
    - Manual: `Alert::resolve($userId, 'manual')` via web UI
    - Work order: `WorkOrderService::complete()` -> `Alert::resolve($userId, 'work_order')`
14. **Dismiss** -- `Alert::dismiss($userId)` -- terminal state

---

## 4. Work Order Lifecycle

**Actors:** System, **site_manager**, **technician**

1. **Auto from health check:** `CheckDeviceHealth` detects offline >15min / battery <20% -> `WorkOrderService::createFromTrigger()` (note: dispatch not yet wired)
2. **Auto from alert:** `WorkOrderService::createFromAlert(alert)` -- title "WO: {rule_name} -- {device_name}" (note: manual only via web UI)
3. **Manual:** `WorkOrderController::store` -- type, title, priority, device_id, assigned_to -> `WorkOrder::create()` status=open
4. **Assign** -- `WorkOrder::assign($userId)` -> status=assigned
5. **Start** -- `WorkOrder::start()` -> status=in_progress
6. **Complete** -- `WorkOrderService::complete($wo, $userId)` -> status=completed (side effect: auto-resolves linked alert with resolution_type=work_order)
7. **Cancel** -- `WorkOrder::cancel()` -> status=cancelled (from any state)
8. Add photo/note -- `WorkOrderController::addPhoto` / `addNote` (side effect: activity logged via Spatie)

---

## 5. Morning Summaries

**Actors:** System (scheduled)

1. **Store-level:** `SendMorningSummary` checks site timezone + opening_hour -> `MorningSummaryService::generateStoreSummary(site)` -> alert_count_24h, active_alerts, device_status, temperature_by_zone (recipients: **site_viewer**)
2. **Regional:** `SendRegionalSummary` triggers 30min after earliest opening -> `MorningSummaryService::generateRegionalSummary(user)` -> cross-site aggregation (recipients: **site_manager**)
3. **Corporate:** `SendCorporateSummary` iterates all orgs -> `MorningSummaryService::generateCorporateSummary(org)` -> org-wide totals (recipients: **org_admin**, target 8:00 AM)

(note: all three are data-complete but delivery is log-only; none are registered in routes/console.php)

---

## 6. Reporting

**Actors:** **site_viewer**, **site_manager**, **org_admin**

1. **Temperature:** `ReportController::temperature(site)` (default 7d) -> `TemperatureReport::generateReport()` -> per_zone min/max/avg, `detectExcursions()` with thresholds from recipe/alert rules -> compliance_pct
2. **Energy:** `ReportController::energy(site)` (default 30d) -> `EnergyReport::generateConsumptionReport()` -> per_device stats, daily_totals at $2.50/kWh, baseline_comparison_pct, night_waste analysis
3. **PDF download:** `ReportController::downloadTemperature` / `downloadEnergy` -> `Pdf::loadView()` via DomPDF -> file download
4. **On-demand summary:** `ReportController::summary(site)` -> `MorningSummaryService::generateStoreSummary`

---

## 7. Billing

**Actors:** **super_admin**, **org_admin**

1. **Auto-subscription:** `PartnerController::store` -> `BillingProfile::create()` (placeholder RFC) -> `SubscriptionService::createSubscription()` base_fee=$500, status=active
2. **Metering:** `SubscriptionService::addDevice(sub, device)` -> SubscriptionItem with fee from `getSensorPricing()` (10 models, default $100)
3. **Monthly total:** `Subscription::calculateMonthlyTotal()` = base_fee * (1 - discount_pct/100) + SUM(items.monthly_fee) (note: gateway addon $2,500/mo not yet included)
4. **Invoice:** `BillingController::generateInvoice` (duplicate check) -> `InvoiceService::generateInvoice()` subtotal + IVA 16% = total, status=draft
5. **CFDI:** `FacturapiService::createCfdi(invoice)` -> UUID, status=sent (stub -- no Facturapi API call)
6. **Payment:** `BillingController::markInvoicePaid` -> `InvoiceService::markPaid()` status=paid, paid_at=now
7. **Download:** `BillingController::downloadInvoice(invoice, pdf|xml)` -> `FacturapiService::downloadPdf/downloadXml` (stub)

---

## 8. Compliance

**Actors:** **org_admin**, System

### Create Event

1. **org_admin** creates compliance event
   - `ComplianceCalendarController::store` -- type, title, due_date, site_id
   - Types: cofepris_audit, certificate_renewal, calibration, inspection, permit_renewal
   - Status: pending (default)

### Automated Reminders

2. `SendComplianceRemindersCommand` (artisan `compliance:send-reminders`)
   - Checks events with due_date matching today + 30/7/1 days
3. Skips if reminder already sent (tracked in `reminders_sent` JSON array)
4. Finds **org_admin** users for the event's organization
5. `Mail::send(new ComplianceReminderMail(event, daysBefore))` to each admin
   - (side effect: updates reminders_sent on event, logs to activity_log)
6. Supports `--dry-run` flag for preview

### Complete Event

7. **org_admin** marks event complete
   - `ComplianceCalendarController::complete` -- status=completed, completed_at, completed_by
   - Overdue: events past due_date with status != completed (no auto-transition)

---

## 9. User Management

**Actors:** **org_admin**

1. **org_admin** creates user within their organization
   - `UserManagementController::store` -- name, email, password, role, site_ids, has_app_access
2. `User::create()` with org_id scoped to current organization
3. `$user->assignRole()` -- one of: org_admin, site_manager, site_viewer, technician
4. Assign site access via pivot table
   - `$user->sites()->attach(orgSiteIds)` with assigned_at, assigned_by
   - (side effect: only sites within the org are attached)
5. has_app_access=false creates WhatsApp-only user (no login, password=null)

### Update User

6. `UserManagementController::update` -- syncs role, site assignments
   - `$user->syncRoles()` replaces existing role
   - `$user->sites()->sync()` replaces all site assignments

### Delete User

7. `UserManagementController::destroy` -- detaches sites, soft-deletes user
   - (guard: cannot delete self)

---

## 10. Integration Export

**Actors:** **org_admin**, System

### SAP Export

1. **Invoices:** `SapExportService::exportInvoices(org, period)`
   - Queries invoices for period, POSTs JSON to SAP endpoint
   - (side effect: stores local audit copy at exports/sap/{slug}_invoices_{period}.json)
2. **Activity Log:** `SapExportService::exportActivityLog(org, from, to)`
   - Queries activity_log entries for org users, POSTs as journal entries
   - (side effect: stores local audit copy)
3. **Readings CSV:** `SapExportService::exportReadings(org, from, to)`
   - Queries SensorReading joined to devices+sites
   - Writes CSV: Site, Device, DevEUI, Zone, Metric, Value, Timestamp
   - Stored at `exports/sap/{slug}_{from}_{to}.csv`

### CONTPAQ Export

4. **Invoices:** `ContpaqExportService::exportInvoices(org, period)`
   - Formats in CONTPAQ-compatible Mexican ERP layout (documentos)
   - POSTs to `{endpoint}/documentos/importar`
   - (side effect: stores local audit copy at exports/contpaq/)
5. **Catalog Sync:** `ContpaqExportService::syncCatalog(org)`
   - Builds product catalog from SubscriptionItems (sensor model -> service code)
   - POSTs to `{endpoint}/catalogo/sincronizar`
6. **Readings CSV:** `ContpaqExportService::exportReadingsCsv(org, from, to)`
   - Aggregates energy (current metric) per site per day
   - Columns: NumDocumento, Fecha, Concepto, Sitio, Cantidad(kWh), Unidad, PrecioUnitario($2.50), Importe
   - Stored at `exports/contpaq/{slug}_{from}_{to}.csv`

### Configuration

7. `IntegrationController::store` -- upserts IntegrationConfig per org+type (sap/contpaq)
   - Stores config JSON, schedule_cron, active flag
8. Both services update `IntegrationConfig.last_export_at` on success

---

## 11. Module System

**Actors:** **org_admin**

### Activate Module

1. **org_admin** toggles module on for a site
   - `ModuleController::toggle(site, module)` -- checks if module is active
2. Attach module: `$site->modules()->attach(module_id, ['activated_at' => now()])`
3. Auto-create alert rules from recipes
   - `RecipeApplicationService::applyModuleRecipes(site, module)`
   - Queries `Recipe::where('module_id')` for matching sensor models
   - `RecipeApplicationService::applyRecipeToDevice()` -- creates AlertRule from recipe.default_rules
   - Skips if rule already exists for recipe+device (name LIKE match)
   - (side effect: AlertRule.conditions built from recipe defaults, cooldown=15min)

### Dashboard Guard

4. `EnsureModuleActive` middleware -- verifies module slug is activated for the site
   - Returns 403 if module not activated
   - Used on module-specific dashboard routes (e.g., IAQ, Industrial)

### Deactivate Module

5. **org_admin** toggles module off
   - `$site->modules()->detach(module_id)`
6. Remove auto-created rules
   - `RecipeApplicationService::removeModuleRules(site, module)`
   - Deletes AlertRules where name LIKE recipe name for the site
   - (side effect: rules deleted, alert evaluation stops for those rules)

---

## 12. White-Label Branding

**Actors:** **org_admin**

1. **org_admin** saves branding JSON via `OrganizationSettingsController::update` -- primary_color, secondary_color, accent_color, font_family, logo
2. `Organization::update()` merges new branding keys with existing (side effect: preserves unset keys)
3. `ApplyOrgBranding` middleware reads `current_organization` from container (set by `EnsureOrganizationScope`)
4. `buildCssVariables()` maps to `--brand-primary`, `--brand-secondary`, `--brand-accent`, `--brand-font`
5. Shares via Inertia props: `branding.css_variables` + `org_logo_url`
6. Frontend applies CSS variables to document root; logo from `org_logo_url` (external URLs or storage paths)
