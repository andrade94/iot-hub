# Astrea IoT Platform -- Business Rules Document

> **Date:** 2026-03-15
> **PRD version:** v2.0
> **Codebase commit:** `01bf12e` (main)
> **Source:** All rules derived from code analysis. Implementation status verified against actual source files.

---

## 1. Operational Rules (OP-xxx)

Rules governing how sensor data flows through the system, from physical sensor to stored reading.

---

### OP-001: MQTT Uplink Reception

**Title:** ChirpStack MQTT uplink ingestion

**Description:** When a LoRaWAN sensor transmits data, ChirpStack Cloud publishes a JSON message via MQTT. The `MqttListener` service receives the uplink, extracts the `devEui` from `deviceInfo`, looks up the corresponding `Device` record by `dev_eui`, converts the base64-encoded `data` field to a hex payload, extracts RSSI from the first entry in `rxInfo[]`, and dispatches a `ProcessSensorReading` job with `(deviceId, hexPayload, rssi)`. If `devEui` is missing or the device is not found in the database, the message is logged and discarded.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/ChirpStack/MqttListener.php:22-60`

---

### OP-002: Gateway Heartbeat Tracking

**Title:** Gateway status update on heartbeat

**Description:** When a gateway status event arrives via MQTT, the `MqttListener` looks up the gateway by `chirpstack_id` and updates `last_seen_at` to the current timestamp and `status` to `'online'`. A gateway is considered online if `last_seen_at >= now() - 15 minutes` (defined by the `Gateway::scopeOnline` scope). There is no automatic transition to `'offline'` -- that would require a scheduled health check job (not implemented for gateways).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/ChirpStack/MqttListener.php:66-83`, `app/Models/Gateway.php:45-48`

---

### OP-003: Payload Decoding

**Title:** Sensor-model-specific payload decoding

**Description:** The `DecoderFactory` maintains a registry mapping device models to decoder classes. Currently, seven Milesight models (`EM300-TH`, `CT101`, `WS301`, `GS101`, `EM300-PT`, `EM310-UDL`, `AM307`) are mapped to `MilesightDecoder`. The factory resolves the decoder from the container and calls `decode(model, hexPayload)`, which returns an associative array of `metric => {value, unit}` pairs. If no decoder is registered for the device model, an `InvalidArgumentException` is thrown, and the `ProcessSensorReading` job catches it and logs the error (the job does not re-throw, preventing retries for unsupported models).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Decoders/DecoderFactory.php:12-39`, `app/Jobs/ProcessSensorReading.php:37-47`

---

### OP-004: Reading Storage (Dual-Write)

**Title:** Persist readings to TimescaleDB and Redis simultaneously

**Description:** `ReadingStorageService::store()` performs a dual write for every decoded reading:

1. **TimescaleDB:** Creates a `SensorReading` row per metric with `(time=now, device_id, metric, value, unit)`. This is the permanent time-series record.
2. **Redis:** Updates a hash at key `device:{id}:latest` with each metric as a field, storing `{value, unit, time}` as JSON. The hash expires after 3600 seconds (1 hour) as a safety net; in practice, it is refreshed every reporting interval (~10 min for most sensors).

Redis failure is non-fatal -- the `try/catch` silently swallows exceptions so TimescaleDB storage always completes.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Readings/ReadingStorageService.php:16-50`

---

### OP-005: Device Metadata Update on Reading

**Title:** Update device fields when a new reading is received

**Description:** After storing readings, `ReadingStorageService::store()` updates the `Device` record:

- `last_reading_at` is set to the current timestamp.
- `rssi` is updated if the MQTT message included signal strength.
- `battery_pct` is extracted from the decoded readings if a `battery` metric is present.
- **Auto-activation:** If the device status is `'pending'` or `'provisioned'`, it is automatically changed to `'active'`. This means a device becomes active the moment it sends its first reading -- no manual activation step is required.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Readings/ReadingStorageService.php:33-50`

---

### OP-006: Job Pipeline Chain

**Title:** Sensor reading processing pipeline

**Description:** Data flows through a chain of queued jobs:

1. `MqttListener::handleUplink()` dispatches `ProcessSensorReading` (3 tries, 10s backoff).
2. `ProcessSensorReading::handle()` decodes the payload, stores readings, dispatches `EvaluateAlertRules` (1 try), and broadcasts a `SensorReadingReceived` event via Reverb.
3. `EvaluateAlertRules::handle()` resolves the `RuleEvaluator` service and calls `evaluate(device, readings)`.
4. If a rule triggers, `RuleEvaluator` calls `AlertRouter::route()`, which dispatches `SendAlertNotification` (immediate) and `EscalateAlert` (delayed).

Each step is a separate queued job, providing isolation and retry capability. Broadcasting failure does not fail the pipeline.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Jobs/ProcessSensorReading.php:26-71`, `app/Jobs/EvaluateAlertRules.php:21-29`

---

### OP-007: Live Dashboard Broadcasting

**Title:** Real-time sensor data broadcast via Reverb

**Description:** After storing a reading, `ProcessSensorReading` broadcasts a `SensorReadingReceived` event on a site-specific channel. This uses Laravel Reverb (WebSocket server) via the Pusher protocol. The broadcast is wrapped in a try/catch -- if Reverb is unavailable, the reading is still stored and alert evaluation still runs. The event carries the device and its readings for frontend consumption via Laravel Echo.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Jobs/ProcessSensorReading.php:64-70`

---

### OP-008: Device Online/Offline Threshold

**Title:** 15-minute threshold for device online status

**Description:** A device is considered online if `last_reading_at >= now() - 15 minutes`. This threshold is consistently applied in:

- `Device::isOnline()` method (instance check)
- `Device::scopeOnline()` (query scope for online devices)
- `Device::scopeOffline()` (query scope: null or older than 15 minutes)
- `Gateway::scopeOnline()` (same 15-minute threshold for gateways)
- `CheckDeviceHealth` job (marks active devices as offline when last_reading_at > 15 min)

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Models/Device.php:99-126`, `app/Models/Gateway.php:45-48`

---

### OP-009: Device Health Check -- Offline Detection

**Title:** Scheduled detection of offline devices

**Description:** The `CheckDeviceHealth` job queries all devices with `status = 'active'` whose `last_reading_at` is null or older than 15 minutes. For each such device, it updates the status to `'offline'` and logs the event. The job has TODO comments for Phase 2 (create alert via AlertRouter) and Phase 6 (auto-create work order if offline > 2h). Currently, no alert or work order is generated from this detection.

**Implementation status:** PARTIAL -- Detects and marks offline, but does not create alerts or work orders.

**Code reference:** `app/Jobs/CheckDeviceHealth.php:25-45`

---

### OP-010: Device Health Check -- Low Battery Detection

**Title:** Detect devices with low battery

**Description:** The `CheckDeviceHealth` job queries all `active` devices where `battery_pct` is not null and less than 20%. It logs each device. The low battery threshold of 20% is also codified in the `Device::scopeLowBattery()` scope. Currently, no alert or work order is generated -- only logging occurs (TODO comments reference Phase 2 and Phase 6).

**Implementation status:** PARTIAL -- Detects and logs only. No alerts or work orders dispatched.

**Code reference:** `app/Jobs/CheckDeviceHealth.php:50-67`, `app/Models/Device.php:112-116`

---

### OP-011: Device Health Check -- Scheduling

**Title:** Scheduled job frequency for health checks

**Description:** The `CheckDeviceHealth` job class exists but `routes/console.php` contains no schedule registration for it. The Laravel schedule (routes/console.php) only has the default `inspire` command. The PRD specifies this should run at a regular interval (e.g., every 5 minutes), but the scheduling is not wired.

**Implementation status:** MISSING -- Job exists but is never scheduled.

**Code reference:** `app/Jobs/CheckDeviceHealth.php`, `routes/console.php:1-8`

---

### OP-012: Redis Latest Reading Cache

**Title:** Hot cache for dashboard "current value" queries

**Description:** The Redis hash `device:{id}:latest` stores the most recent reading for each metric as JSON (`{value, unit, time}`). The `ReadingStorageService::getLatest(deviceId)` method retrieves all fields from this hash, providing sub-millisecond dashboard lookups without hitting TimescaleDB. The cache expires after 3600 seconds. If Redis is unavailable, `getLatest()` returns null (dashboards would need a fallback query to TimescaleDB, but this fallback is not implemented in the service).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Readings/ReadingStorageService.php:56-96`

---

## 2. Alert Rules (ALT-xxx)

Rules governing how alerts are evaluated, created, routed, escalated, acknowledged, and resolved.

---

### ALT-001: Rule Evaluation Scope

**Title:** Which rules are evaluated for a device reading

**Description:** When `RuleEvaluator::evaluate()` is called for a device, it queries all `AlertRule` records that are `active` AND match the device's `site_id` AND either have `device_id = null` (site-wide rule) or `device_id` matching the current device. This means site-wide rules apply to every device at that site, while device-specific rules apply only to the target device. Rules from other sites are never evaluated.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:23-37`

---

### ALT-002: Condition Types

**Title:** Supported threshold condition operators

**Description:** The `RuleEvaluator::checkCondition()` method supports three condition types:

- `'above'`: triggers when `value > threshold`
- `'below'`: triggers when `value < threshold`
- `'equals'`: triggers when `abs(value - threshold) < 0.001` (floating-point tolerance)

If the threshold is null, the condition is never breached. Unknown condition types default to `false` (no breach).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:75-87`

---

### ALT-003: Duration-Based Threshold Tracking

**Title:** Sustained breach requirement before alert creation

**Description:** When a threshold is breached, the evaluator does not immediately create an alert (unless `duration_minutes = 0`). Instead, it tracks the breach in Redis using key `alert_rule_state:{rule_id}:{device_id}:{metric}`, storing `{first_breach_at, reading_count, last_value}` with a 3600-second TTL.

- **First breach (duration > 0):** State is created in Redis but no alert fires.
- **Subsequent breaches:** `reading_count` is incremented, `last_value` updated.
- **Duration met:** When `elapsed = now - first_breach_at >= duration_minutes`, the alert fires (subject to cooldown check).
- **First breach (duration = 0):** Alert triggers immediately and state is cleared.

This prevents momentary spikes from generating false alarms.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:92-141`

---

### ALT-004: Cooldown Period Enforcement

**Title:** Prevent duplicate alerts within cooldown window

**Description:** After an alert triggers, a Redis key `alert_cooldown:{rule_id}:{device_id}` is set with a TTL of `rule.cooldown_minutes * 60` seconds. Before triggering a new alert for the same rule+device, the evaluator checks for this key's existence. If present, the alert is suppressed. If Redis is unavailable, the system falls back to a database query: checks for any alert with the same `rule_id` and `device_id` triggered within the last `cooldown_minutes`.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:227-253`

---

### ALT-005: Alert Creation and Data Snapshot

**Title:** Alert record content on trigger

**Description:** When an alert fires, `RuleEvaluator::triggerAlert()` creates an `Alert` record with:

- `rule_id`, `site_id`, `device_id` linking to the source
- `severity` from the condition or rule default
- `status = 'active'`
- `triggered_at = now()`
- `data` JSON containing: `metric`, `value` (trigger reading), `threshold`, `condition` (above/below/equals), `rule_name`, `device_name`, `device_model`, `zone`

This data snapshot preserves the alert context even if the rule or device is later modified.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:182-222`

---

### ALT-006: Auto-Resolution on Normal Readings

**Title:** 2 consecutive normal readings auto-resolve active alerts

**Description:** When a reading does NOT breach the threshold, `handleNormal()` clears any breach tracking state and increments a counter at Redis key `alert_normal_count:{rule_id}:{device_id}:{metric}` (1-hour TTL). When this counter reaches 2, all `active` alerts for that `rule_id + device_id` combination are resolved with `resolution_type = 'auto'` and `resolved_by = null`. The counter is then cleared. This ensures alerts are only auto-resolved after sustained return to normal, not on a single passing normal reading.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/RulesEngine/RuleEvaluator.php:147-177`

---

### ALT-007: Alert Routing by Severity

**Title:** Escalation levels triggered based on alert severity

**Description:** `AlertRouter::route()` loads the `EscalationChain` for the alert's site, ordered by level. It then determines which levels to notify based on severity:

| Severity | Levels Notified |
|---|---|
| `critical` | 1, 2, 3 (all levels up to max 3) |
| `high` | 1, 2 |
| `medium` | 1 only |
| `low` | 1 only |

Level 1 contacts are notified immediately via `SendAlertNotification` dispatch. Higher levels are notified via `EscalateAlert` dispatch with a cumulative delay calculated by summing `delay_minutes` of all levels up to and including the target level.

If no escalation chain is configured for the site, a warning is logged and the alert is only broadcast via Reverb (no personal notifications sent).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Alerts/AlertRouter.php:16-61`

---

### ALT-008: Alert Broadcast Fallback

**Title:** Always broadcast alerts via Reverb regardless of escalation chain

**Description:** Every alert routed through `AlertRouter::route()` triggers a `broadcast(new AlertTriggered($alert))->toOthers()` call at the end of the method, regardless of whether escalation chain contacts exist. This ensures live web dashboard users always see new alerts in real-time. Broadcast failure is caught and logged at debug level -- it does not prevent notification delivery.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Alerts/AlertRouter.php:59-61`, `app/Services/Alerts/AlertRouter.php:80-87`

---

### ALT-009: Escalation Guard

**Title:** Skip escalation if alert already handled

**Description:** `EscalationService::escalate()` checks the alert's current status before sending. If the status is `'acknowledged'`, `'resolved'`, or `'dismissed'`, the escalation is skipped and logged. This prevents late-arriving escalation jobs from notifying users about alerts that have already been addressed. The `EscalateAlert` job is dispatched with a time delay (see ALT-007), so this guard is essential to avoid unnecessary notifications.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Alerts/EscalationService.php:15-36`

---

### ALT-010: Notification Delivery Guard

**Title:** Skip notification if alert already resolved or dismissed

**Description:** `SendAlertNotification::handle()` checks the alert's status before sending. If the status is `'resolved'` or `'dismissed'`, the notification is skipped silently. Unlike the escalation guard (ALT-009), this does NOT skip for `'acknowledged'` status -- an acknowledged alert can still receive notifications (e.g., from a higher escalation level arriving after Level 1 acknowledged).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Jobs/SendAlertNotification.php:35-37`

---

### ALT-011: Notification Audit Trail

**Title:** Every notification attempt is logged to alert_notifications

**Description:** Before attempting delivery, `SendAlertNotification` creates an `AlertNotification` record with `status = 'sent'`. After the delivery attempt, the record is updated to `'delivered'` (with `delivered_at`) on success, or `'failed'` (with `error` message) on failure. This provides a complete audit trail of every WhatsApp, push, and email sent for every alert.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Jobs/SendAlertNotification.php:39-58`

---

### ALT-012: WhatsApp Alert Templates

**Title:** Severity-based Spanish-language WhatsApp message templates

**Description:** `TwilioService::getTemplate()` generates different message formats based on severity:

- **Critical:** Red circle emoji, "ALERTA CRITICA", includes site, zone, device, metric value vs threshold, timestamp, and reply instructions (ACK to acknowledge, ESC to escalate).
- **High:** Orange circle emoji, "Alerta Alta", includes site, zone, device, metric value, timestamp. No reply instructions.
- **Medium/Low:** Yellow circle emoji, "Alerta", abbreviated format with site, device, metric, timestamp.

Only critical alerts include the ACK/ESC reply instructions because critical alerts require immediate response.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/WhatsApp/TwilioService.php:85-115`

---

### ALT-013: WhatsApp Acknowledgment via Webhook

**Title:** Process ACK/ESC replies from Twilio webhook

**Description:** `TwilioService::processWebhook()` parses incoming Twilio webhook payloads. It extracts the phone number from `From` (stripping the `whatsapp:` prefix) and checks the `Body` text for `ACK` or `ESC` (case-insensitive, using `str_contains`). The `WhatsAppWebhookController` then looks up the user by `whatsapp_phone`, finds their most recent active alert across all accessible sites, and applies the action:

- `'acknowledge'`: calls `$alert->acknowledge($user->id)`
- `'escalate'`: currently a no-op (null)

**Limitation:** The webhook acknowledges the most recent active alert, not a specific alert. If a user has multiple active alerts, only the latest one is acknowledged.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/WhatsApp/TwilioService.php:121-144`, `app/Http/Controllers/Api/WhatsAppWebhookController.php:14-49`

---

### ALT-014: Push Notification Channel

**Title:** Push notification delivery for alerts

**Description:** The `SendAlertNotification` job handles a `'push'` channel via the `sendPush()` method. It resolves the alert's device and site, constructs a title with severity prefix (e.g., "CRITICAL Alert -- Site Name") and a body with the device name, then calls `PushNotificationService::sendToUser()`. The `PushNotificationService` sends to all registered Expo push tokens for the user via the Expo Push API, handles expired/invalid tokens by removing them from the database. Push tokens are stored in the `push_tokens` table via the `PushToken` model, managed by `PushTokenApiController` (register on login, unregister on logout).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Jobs/SendAlertNotification.php:66-87`, `app/Services/Push/PushNotificationService.php`, `app/Models/PushToken.php`

---

### ALT-015: Email Notification Channel

**Title:** Email notification delivery for alerts

**Description:** The `SendAlertNotification` job handles an `'email'` channel, but the implementation is a placeholder that logs the attempt and returns `true` (always succeeds). No `AlertMail` Mailable class exists. The TODO comment references creating an AlertMail notification.

**Implementation status:** STUB -- Logs only, no actual email delivery.

**Code reference:** `app/Jobs/SendAlertNotification.php:77-86`

---

### ALT-016: Defrost Suppression Logic

**Title:** Suppress temperature alerts during known defrost windows

**Description:** `DefrostDetector::shouldSuppressAlert()` checks if the current time (in the device's site timezone) falls within a detected/confirmed/manual defrost window, with a 15-minute buffer on each side. It only applies to temperature metric alerts. The method handles midnight wrap-around correctly. However, `RuleEvaluator` does NOT call `shouldSuppressAlert()` before evaluating rules -- the integration is not wired. This means cold chain installations will generate false alarms during defrost cycles.

**Implementation status:** PARTIAL -- Suppression logic is complete, but not called from the evaluation pipeline.

**Code reference:** `app/Services/RulesEngine/DefrostDetector.php:158-206`

---

### ALT-017: Twilio Graceful Degradation

**Title:** WhatsApp delivery silently skips when Twilio is not configured

**Description:** If `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` config values are empty, `TwilioService::sendMessage()` logs a debug message ("Twilio not configured -- skipping WhatsApp") and returns `false`. This means the system can run in development without Twilio credentials -- WhatsApp alerts will be logged as `'failed'` in `AlertNotification` but no exception is thrown.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/WhatsApp/TwilioService.php:47-49`

---

## 3. State Machines (SM-xxx)

Lifecycle definitions for entities with discrete status transitions.

---

### SM-001: Alert Lifecycle

**Title:** Alert status transitions: active -> acknowledged -> resolved/dismissed

**Description:** An alert progresses through the following states:

| Current State | Action | Next State | Method | Who Can Trigger |
|---|---|---|---|---|
| `active` | Acknowledge | `acknowledged` | `Alert::acknowledge($userId)` | Any user with `acknowledge alerts` permission, or via WhatsApp ACK reply |
| `active` | Resolve | `resolved` | `Alert::resolve($userId, 'manual')` | Any user via web UI |
| `active` | Auto-resolve | `resolved` | `Alert::resolve(null, 'auto')` | System (2 consecutive normal readings) |
| `active` | Dismiss | `dismissed` | `Alert::dismiss($userId)` | Any user via web UI |
| `acknowledged` | Resolve | `resolved` | `Alert::resolve($userId, 'manual')` | Any user via web UI |
| `acknowledged` | Auto-resolve | `resolved` | `Alert::resolve(null, 'auto')` | System |
| `acknowledged` | Work order complete | `resolved` | `Alert::resolve($userId, 'work_order')` | Via `WorkOrderService::complete()` |
| `resolved` | -- | Terminal | -- | -- |
| `dismissed` | -- | Terminal | -- | -- |

**Fields set on transition:**
- `acknowledge()`: sets `acknowledged_at = now()`, `resolved_by = userId`
- `resolve()`: sets `resolved_at = now()`, `resolved_by = userId`, `resolution_type` = auto/manual/work_order
- `dismiss()`: sets `resolved_at = now()`, `resolved_by = userId`, `resolution_type = 'dismissed'`

**Scopes:**
- `active()`: status = active
- `unresolved()`: status in [active, acknowledged]

**Note:** There is no model-level enforcement of valid transitions. The methods will update status from any state. Behavioral enforcement comes from the calling code (e.g., EscalationService skips resolved/dismissed alerts).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Models/Alert.php:64-112`

---

### SM-002: Work Order Lifecycle

**Title:** Work order status transitions: open -> assigned -> in_progress -> completed/cancelled

**Description:** A work order progresses through the following states:

| Current State | Action | Next State | Method |
|---|---|---|---|
| `open` | Assign | `assigned` | `WorkOrder::assign($userId)` -- also sets `assigned_to` |
| `assigned` | Start | `in_progress` | `WorkOrder::start()` |
| `in_progress` | Complete | `completed` | `WorkOrder::complete()` |
| Any | Cancel | `cancelled` | `WorkOrder::cancel()` |

**Side effects:**
- Completing a work order via `WorkOrderService::complete()` also auto-resolves the linked alert (if `alert_id` is set) with `resolution_type = 'work_order'`.

**Scopes:**
- `open()`: status = open
- `forSite(int)`: filter by site_id
- `assignedTo(int)`: filter by assigned_to user

**Activity logging:** Status changes, priority, type, and assigned_to are logged via Spatie Activity Log.

**Note:** Like alerts, there is no model-level guard against invalid transitions (e.g., completing a non-started work order).

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Models/WorkOrder.php:93-122`, `app/Services/WorkOrders/WorkOrderService.php:60-73`

---

### SM-003: Device Status Lifecycle

**Title:** Device status transitions: pending -> provisioned -> active -> offline -> maintenance -> decommissioned

**Description:** Device statuses and their transitions:

| Status | Meaning | Transition To | Triggered By |
|---|---|---|---|
| `pending` | Device created in DB but not yet provisioned | `active` (auto, on first reading) | `ReadingStorageService::store()` |
| `provisioned` | Registered in ChirpStack but no data yet | `active` (auto, on first reading) | `ReadingStorageService::store()` |
| `active` | Receiving data normally | `offline` (auto, no data > 15 min) | `CheckDeviceHealth` job |
| `offline` | No data received for > 15 minutes | `active` (auto, on next reading) | `ReadingStorageService::store()` |
| `maintenance` | Under maintenance | -- | Manual update only |
| `decommissioned` | Permanently removed | -- | Manual update only |

**Auto-activation rule (OP-005):** When a reading is received and the device status is `'pending'` or `'provisioned'`, it is automatically set to `'active'`. Note: the auto-activation does NOT restore offline devices -- only pending/provisioned. An offline device receiving a new reading would need an explicit status update (not currently implemented; the last_reading_at update would make `isOnline()` return true, but the status field would remain `'offline'` until the next `CheckDeviceHealth` run or manual update).

**Implementation status:** PARTIAL -- Auto-activation from pending/provisioned works. Offline detection works. Recovery from offline to active on new reading is NOT automatic at the status field level.

**Code reference:** `app/Services/Readings/ReadingStorageService.php:46-49`, `app/Jobs/CheckDeviceHealth.php:27-35`, `app/Models/Device.php:99-126`

---

### SM-004: Defrost Schedule Status Lifecycle

**Title:** Defrost schedule status transitions: learning -> detected -> confirmed -> manual

**Description:** Defrost schedule statuses:

| Status | Meaning | Transition |
|---|---|---|
| `learning` | System is collecting spike data (first 48 hours) | Not yet implemented as a database status |
| `detected` | Pattern analysis found recurring defrost windows | Created by `DefrostDetector::createSchedule()` |
| `confirmed` | User confirmed the detected pattern is correct | Manual update via `confirmed_by` and `confirmed_at` |
| `manual` | User manually defined defrost windows | Manual creation |

The `shouldSuppressAlert()` method only considers schedules with status `detected`, `confirmed`, or `manual` -- not `learning`.

**Implementation status:** PARTIAL -- Detection and creation work. No UI for confirmation or manual creation.

**Code reference:** `app/Services/RulesEngine/DefrostDetector.php:213-231`, `app/Services/RulesEngine/DefrostDetector.php:165-167`

---

### SM-005: Invoice Status Lifecycle

**Title:** Invoice status transitions: draft -> sent -> paid/overdue

**Description:** Invoice statuses and transitions:

| Status | Meaning | Transition |
|---|---|---|
| `draft` | Generated by `InvoiceService::generateInvoice()` | -> `sent` via `FacturapiService::createCfdi()` |
| `sent` | CFDI timbrado completed, invoice delivered to client | -> `paid` via `InvoiceService::markPaid()` |
| `paid` | Payment confirmed (SPEI/transfer) | Terminal |
| `overdue` | Payment deadline passed | No automatic transition implemented |

**Scopes:** `draft()`, `overdue()`, `forOrg(int)`

**Note:** There is no scheduled job to transition invoices to `overdue`. There is no controller endpoint that calls `markPaid()`. The CFDI creation is a stub that generates a mock UUID.

**Implementation status:** PARTIAL -- Statuses and model methods exist. No automated transitions, no payment tracking UI.

**Code reference:** `app/Models/Invoice.php:50-63`, `app/Services/Billing/InvoiceService.php:30-42`, `app/Services/Billing/FacturapiService.php:16-33`

---

### SM-006: Subscription Status

**Title:** Subscription statuses

**Description:** Subscriptions have a `status` field. The `SubscriptionService::createSubscription()` method creates subscriptions with `status = 'active'`. No other status transitions are implemented. The model does not define status constants, scopes, or transition methods.

**Implementation status:** PARTIAL -- Creation with active status only. No pause/cancel/suspend logic.

**Code reference:** `app/Services/Billing/SubscriptionService.php:16-27`

---

## 4. Access & Authorization (AC-xxx)

Rules governing multi-tenancy, role-based access, and site-level scoping.

---

### AC-001: Organization Scoping Middleware

**Title:** EnsureOrganizationScope binds current organization to container

**Description:** The `org.scope` middleware (`EnsureOrganizationScope`) runs on every authenticated request:

1. **Unauthenticated users:** Passed through (no scoping).
2. **super_admin users:** Optionally scoped. The organization is determined by `session('current_org_id')` OR the `X-Organization-Id` request header. If neither is set, no organization is bound (super_admin sees all). If set, the organization is resolved from the database and bound as `app()->instance('current_organization', $org)`.
3. **Regular users:** Scoped to their `org_id`. If `org_id` is null, a 403 is returned. If the organization record is not found, a 403 is returned. Otherwise, the organization is bound to the container.

This middleware does NOT filter queries -- it only sets the context. Controllers must explicitly use the bound organization for query scoping.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Http/Middleware/EnsureOrganizationScope.php:12-47`

---

### AC-002: Site Access Middleware

**Title:** EnsureSiteAccess verifies user can access the requested site

**Description:** The `site.access` middleware (`EnsureSiteAccess`) runs on routes with a `{site}` parameter:

1. If no site parameter exists in the route, the request passes through.
2. The site ID is extracted (supports both bound model objects and raw integer IDs).
3. `User::canAccessSite($siteId)` is called, which implements a tiered access check:
   - **super_admin:** Always returns true (access to all sites in all orgs).
   - **org_admin:** Returns true if the site belongs to the user's organization (`site.org_id = user.org_id`).
   - **Other roles (site_manager, site_viewer, technician):** Returns true only if the user has an entry in the `user_sites` pivot table for that site.
4. If access is denied, a 403 response is returned.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Http/Middleware/EnsureSiteAccess.php:10-33`, `app/Models/User.php:82-93`

---

### AC-003: Super Admin Organization Switching

**Title:** Super admin can impersonate any organization

**Description:** Super admins can switch their active organization context via `session('current_org_id')` or the `X-Organization-Id` HTTP header. This affects:

- `EnsureOrganizationScope` middleware: binds the selected org to the container.
- `User::accessibleSites()`: when `current_org_id` is in session, returns only that org's sites instead of all sites.

There is no dedicated UI or controller endpoint for switching organizations. The session value would need to be set by a controller action (not implemented in the reviewed code).

**Implementation status:** PARTIAL -- Middleware supports switching. No UI or controller to trigger the switch.

**Code reference:** `app/Http/Middleware/EnsureOrganizationScope.php:20-28`, `app/Models/User.php:67-71`

---

### AC-004: Role Permission Matrix

**Title:** Spatie role-permission assignments

**Description:** Five roles with specific permission sets:

| Role | Permissions |
|---|---|
| **super_admin** | ALL permissions (21 total) |
| **org_admin** | All EXCEPT `manage organizations` and `access command center` (19 permissions) |
| **site_manager** | `view sites`, `manage sites`, `view devices`, `manage devices`, `view alerts`, `acknowledge alerts`, `manage alert rules`, `view users`, `assign site users`, `view reports`, `generate reports`, `view work orders`, `manage work orders`, `view activity log` (14 permissions) |
| **site_viewer** | `view sites`, `view devices`, `view alerts`, `view reports` (4 permissions) |
| **technician** | `view sites`, `view devices`, `view alerts`, `acknowledge alerts`, `view work orders`, `complete work orders` (6 permissions) |

**Key observations:**
- `site_viewer` cannot acknowledge alerts (only view).
- `technician` can acknowledge alerts and complete work orders but cannot manage them.
- `org_admin` cannot access the Command Center.
- Only `super_admin` can `manage organizations`.
- `provision devices` permission exists but is only assigned to `org_admin` (via the "all except" logic) and `super_admin`.

**Implementation status:** IMPLEMENTED

**Code reference:** `database/seeders/RolesAndPermissionsSeeder.php:12-101`

---

### AC-005: Accessible Sites Resolution

**Title:** User::accessibleSites() determines which sites a user can see

**Description:** The `accessibleSites()` method returns different site collections based on role:

- **super_admin:** If `current_org_id` is in session, returns all sites for that org. If not, returns ALL sites across all orgs.
- **org_admin:** Returns all sites where `org_id` matches the user's `org_id`.
- **All other roles:** Returns only sites from the `user_sites` pivot table (via the `sites()` relationship).

This method is used for:
- `HandleInertiaRequests` middleware (populates `accessible_sites` shared prop)
- `MorningSummaryService::generateRegionalSummary()` (determines which sites to include)
- `WhatsAppWebhookController` (determines which sites' alerts can be acknowledged)

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Models/User.php:65-80`

---

### AC-006: Non-App Users (WhatsApp-Only)

**Title:** Users with has_app_access=false exist only for WhatsApp alerts

**Description:** The `User` model supports users with `has_app_access = false` and `password = null`. These users cannot log into the web or mobile app. They exist solely to receive WhatsApp alert notifications via escalation chains. Their `whatsapp_phone` is used for notification delivery and webhook matching. Typical personas: night guards, external repair technicians, building managers who prefer WhatsApp over web apps.

**Implementation status:** IMPLEMENTED (schema and model support)

**Code reference:** `app/Models/User.php:22-30`

---

## 5. Financial Rules (FIN-xxx)

Rules governing subscription pricing, invoice generation, and billing.

---

### FIN-001: Subscription Base Fee

**Title:** Fixed monthly base fee per organization

**Description:** Every subscription has a `base_fee` set to 500.00 (MXN) by default when created via `SubscriptionService::createSubscription()`. The base fee can have a `discount_pct` applied. The discounted base is calculated as: `base_fee * (1 - discount_pct / 100)`.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Billing/SubscriptionService.php:16-27`

---

### FIN-002: Per-Sensor Pricing Map

**Title:** Monthly fee varies by sensor model

**Description:** `SubscriptionService::getSensorPricing()` defines the per-device monthly fee:

| Sensor Model | Monthly Fee (MXN) |
|---|---|
| EM300-TH | $150.00 |
| CT101 | $200.00 |
| WS301 | $100.00 |
| EM300-MCS | $120.00 |
| EM500-UDL | $180.00 |
| VS121 | $250.00 |
| AM307 | $175.00 |
| EM300-DI | $130.00 |
| WS101 | $80.00 |
| WS202 | $90.00 |

If a device model is not in the map, a default fee of $100.00 is applied. The fee is stored per `SubscriptionItem` so pricing changes do not retroactively affect existing subscriptions.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Billing/SubscriptionService.php:59-73`

---

### FIN-003: Monthly Total Calculation

**Title:** Subscription monthly total formula

**Description:** `Subscription::calculateMonthlyTotal()` computes:

```
total = (base_fee * (1 - discount_pct / 100)) + SUM(subscription_items.monthly_fee)
```

The result is rounded to 2 decimal places. Gateway addon fees are NOT included in this calculation -- the `Gateway.is_addon` field exists but is not factored into billing logic.

**Implementation status:** PARTIAL -- Core calculation works. Gateway addon billing not implemented.

**Code reference:** `app/Models/Subscription.php:48-54`

---

### FIN-004: Invoice Generation

**Title:** Create an invoice from a subscription for a billing period

**Description:** `InvoiceService::generateInvoice()` creates an `Invoice` record with:

- `subtotal` = `subscription.calculateMonthlyTotal()`
- `iva` = `subtotal * 0.16` (Mexican IVA tax rate, rounded to 2 decimals)
- `total` = `subtotal + iva` (rounded to 2 decimals)
- `status` = `'draft'`
- `period` = the period string passed as argument (e.g., "2026-03")

The method is never called from any controller, scheduled job, or command. There is no automated monthly invoice generation.

**Implementation status:** STUB -- Logic exists but is never invoked.

**Code reference:** `app/Services/Billing/InvoiceService.php:13-28`

---

### FIN-005: Payment Recording

**Title:** Mark an invoice as paid

**Description:** `InvoiceService::markPaid()` updates an invoice with `status = 'paid'`, `paid_at = now()`, and the provided `payment_method` (e.g., 'spei', 'transfer'). This method is never called from any controller -- there is no payment tracking UI or API endpoint.

**Implementation status:** STUB -- Method exists but is never invoked.

**Code reference:** `app/Services/Billing/InvoiceService.php:30-42`

---

### FIN-006: CFDI Timbrado (Tax-Compliant Invoice Stamping)

**Title:** Generate CFDI 4.0 electronic invoice via Facturapi

**Description:** `FacturapiService::createCfdi()` is a placeholder that:

1. Logs the call with invoice details.
2. Generates a random UUID (does NOT call Facturapi API).
3. Updates the invoice with `cfdi_uuid` and changes status to `'sent'`.

The `downloadPdf()` and `downloadXml()` methods log calls and return `null`. No actual Facturapi API integration exists.

**Implementation status:** STUB -- All three methods are placeholders.

**Code reference:** `app/Services/Billing/FacturapiService.php:16-61`

---

### FIN-007: SAP Export

**Title:** Export sensor readings in SAP-compatible CSV format

**Description:** `SapExportService::exportReadings()` queries all sensor readings for an organization's sites within a date range and exports them as a CSV file with columns: Site, Device, DevEUI, Zone, Metric, Value, Timestamp. The file is stored on the local disk at `exports/sap/{slug}_{from}_{to}.csv`. Handles CSV escaping for values containing commas, quotes, or newlines.

**Implementation status:** IMPLEMENTED (service logic works, but integration with controllers/UI is through IntegrationController which may be partial)

**Code reference:** `app/Services/Integrations/SapExportService.php:17-69`

---

### FIN-008: CONTPAQ Export

**Title:** Export energy consumption in CONTPAQ-compatible invoice CSV format

**Description:** `ContpaqExportService::exportInvoices()` aggregates energy (`current` metric) readings per site per day and exports as CSV with columns: NumDocumento, Fecha, Concepto, Sitio, Cantidad (kWh), Unidad, PrecioUnitario ($2.50 MXN/kWh hardcoded), Importe. Supports both PostgreSQL and SQLite (uses `DATE()` vs `strftime()`). The file is stored at `exports/contpaq/{slug}_{from}_{to}.csv`.

**Implementation status:** IMPLEMENTED (service logic)

**Code reference:** `app/Services/Integrations/ContpaqExportService.php:18-114`

---

### FIN-009: Gateway Addon Billing

**Title:** Additional gateway billing at $2,500/month

**Description:** The PRD specifies that the first gateway per site is included in the base fee. Each additional gateway (where `Gateway.is_addon = true`) should be billed at $2,500 MXN/month. The `is_addon` boolean field exists on the `Gateway` model and migration, but `Subscription::calculateMonthlyTotal()` does not query or include gateway addon fees. No billing logic processes addon gateways.

**Implementation status:** MISSING -- Schema exists, billing logic not implemented.

**Code reference:** `app/Models/Gateway.php:20` (is_addon field)

---

## 6. Communication Rules (COM-xxx)

Rules governing notifications, summaries, and communication delivery.

---

### COM-001: Morning Summary -- Store Level

**Title:** Deliver daily summary to site_viewer users at site opening time

**Description:** The `SendMorningSummary` job runs every minute (intended to be scheduled, but scheduling is not wired in `routes/console.php`). For each active site with a configured timezone and `opening_hour`, it checks if the current local time (converted from UTC) matches the opening hour down to the minute. If it matches, `MorningSummaryService::generateStoreSummary()` is called, producing:

- `alert_count_24h`: total alerts in last 24 hours
- `active_alerts`: list of unresolved alerts with severity, device name, data snapshot
- `device_status`: counts of online, offline, low_battery, total
- `temperature_by_zone`: min/max/avg temperature per zone in last 24 hours

The summary data is generated but delivery is a TODO -- it is only logged via `Log::info()`. No email, push, or in-app notification is sent.

**Implementation status:** PARTIAL -- Data generation works. Delivery not implemented. Job not scheduled.

**Code reference:** `app/Jobs/SendMorningSummary.php:26-77`, `app/Services/Reports/MorningSummaryService.php:25-38`

---

### COM-002: Morning Summary -- Regional Level

**Title:** Deliver aggregated summary to site_manager users 30 minutes after earliest site opening

**Description:** The `SendRegionalSummary` job runs every minute (not scheduled). For each `site_manager`, it finds the earliest opening hour among their assigned sites and triggers 30 minutes after that. This delay ensures all per-site summaries have been generated before the roll-up.

`MorningSummaryService::generateRegionalSummary()` aggregates across the manager's sites:
- Per-site alert counts and device status
- Total alerts (24h and active) across all sites
- Aggregated device online/offline/low_battery totals

Delivery is a TODO -- logged only.

**Implementation status:** PARTIAL -- Data generation and timing logic work. Delivery not implemented. Job not scheduled.

**Code reference:** `app/Jobs/SendRegionalSummary.php:26-95`, `app/Services/Reports/MorningSummaryService.php:46-85`

---

### COM-003: Morning Summary -- Corporate Level

**Title:** Deliver organization-wide summary to org_admin users

**Description:** The `SendCorporateSummary` job iterates over all organizations that have sites, finds their `org_admin` users, and generates an organization-wide summary via `MorningSummaryService::generateCorporateSummary()`. The summary covers all active sites in the organization with per-site breakdowns and organization-wide totals.

The PRD specifies this should be sent at 8:00 AM, but there is no timezone-aware triggering (unlike the store-level summary). Delivery is a TODO -- logged only. Job is not scheduled.

**Implementation status:** PARTIAL -- Data generation works. No time-of-day check. Delivery not implemented. Job not scheduled.

**Code reference:** `app/Jobs/SendCorporateSummary.php:25-60`, `app/Services/Reports/MorningSummaryService.php:92-130`

---

### COM-004: WhatsApp Alert Delivery

**Title:** Send alert notifications via Twilio WhatsApp API

**Description:** `TwilioService::sendAlert()` sends a WhatsApp message to the user's `whatsapp_phone`. The message body is generated by severity-specific Spanish-language templates (see ALT-012). The Twilio API is called via `Http::asForm()->withBasicAuth()` to the Messages endpoint. The method returns `true` on success, `false` on failure (no exception propagated).

**Prerequisites:** User must have a non-null `whatsapp_phone`. Twilio credentials must be configured in `config('services.twilio')`.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/WhatsApp/TwilioService.php:28-79`

---

### COM-005: Alert Broadcast via WebSocket

**Title:** Real-time alert notification to web dashboard via Reverb

**Description:** Every alert routed through `AlertRouter` triggers a `broadcast(new AlertTriggered($alert))` call. This pushes the alert data to connected WebSocket clients (site-specific channels). Frontend pages consume this via Laravel Echo. This is the only always-active notification channel -- it works regardless of escalation chain configuration.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Alerts/AlertRouter.php:80-87`

---

### COM-006: Alert Notification Rate Limiting

**Title:** Batch WhatsApp notifications during mass events

**Description:** The PRD specifies that during city-wide power outages, WhatsApp alerts should be batched to prevent Twilio API spam. No rate limiting, batching, or deduplication logic exists in the current codebase. Each alert triggers individual notification dispatches.

**Implementation status:** MISSING

**Code reference:** N/A

---

## 7. Automation Rules (AUTO-xxx)

Rules governing scheduled jobs, automated workflows, and machine learning.

---

### AUTO-001: Defrost Pattern Learning

**Title:** Auto-learn defrost cycles from 48 hours of temperature data

**Description:** The `LearnDefrostPattern` job analyzes temperature readings for a device:

1. **Minimum data requirement:** Device must have been installed for at least 49 hours (`installed_at` check).
2. **Spike detection:** `DefrostDetector::analyzeSpikes()` scans readings for temperature rises >5 degrees C above baseline within 30-minute windows. Baseline is the median of the lowest 60% of readings. Spikes longer than 120 minutes are discarded (not defrost). A spike "ends" when temperature returns to within 2 degrees C of baseline.
3. **Pattern matching:** Spikes are split into Day 1 and Day 2. `detectPattern()` compares them: a DEFROST pattern requires spikes at the same time-of-day (+/- 30 min), duration 15-45 minutes, recovery within 60 minutes, occurring on both days.
4. **Schedule creation:** If patterns are found, `createSchedule()` creates a `DefrostSchedule` with `status = 'detected'` and the detected windows.

The job exists but is never dispatched from any code. There is no scheduled trigger or event-based invocation.

**Implementation status:** PARTIAL -- Full analysis logic implemented. Job never dispatched.

**Code reference:** `app/Jobs/LearnDefrostPattern.php:22-107`, `app/Services/RulesEngine/DefrostDetector.php:20-85`

---

### AUTO-002: Baseline Learning for Anomaly Detection

**Title:** Learn normal consumption patterns for baseline comparison

**Description:** `BaselineService::learnBaseline()` analyzes 14 days of readings for a device, computing hourly averages and standard deviations grouped by day type (weekday vs weekend). The result is an array of `{hour, day_type, avg_value, std_dev}` entries. Supports PostgreSQL (using `EXTRACT` and `ISODOW`) and SQLite (using `strftime` with PHP-side aggregation).

`BaselineService::checkAnomaly()` compares a current value against the learned baseline for the current hour and day type. An anomaly is detected when the deviation exceeds 2 standard deviations:

| Deviation Multiple | Severity |
|---|---|
| > 4 sigma | `critical` |
| > 3 sigma | `warning` |
| > 2 sigma | `info` |
| <= 2 sigma | Normal (returns null) |

The baseline service exists but is never called from the rules engine or any controller.

**Implementation status:** PARTIAL -- Full analysis logic implemented. Not integrated into the evaluation pipeline.

**Code reference:** `app/Services/RulesEngine/BaselineService.php:17-58`, `app/Services/RulesEngine/BaselineService.php:141-185`

---

### AUTO-003: Night Waste Detection

**Title:** Compare overnight energy consumption against expected idle baseline

**Description:** `BaselineService::getNightWaste()` calculates energy waste during night hours (23:00-07:00) by comparing actual consumption against the expected idle baseline derived from learned hourly patterns. It returns:

- `actual`: sum of all readings in the night window
- `expected`: sum of baseline averages for hours 23, 0, 1, 2, 3, 4, 5, 6
- `waste_pct`: percentage deviation from expected

This logic exists but is never called from any job, controller, or alert rule.

**Implementation status:** PARTIAL -- Calculation logic exists. Not integrated.

**Code reference:** `app/Services/RulesEngine/BaselineService.php:249-268`

---

### AUTO-004: Auto-Create Work Order from Health Check

**Title:** Automatically create work orders for battery/offline issues

**Description:** The `CreateWorkOrder` job accepts a device ID, type, priority, and title. It calls `WorkOrderService::createFromTrigger()` to create a work order linked to the device. However, the `CheckDeviceHealth` job (which detects offline and low-battery devices) has TODO comments but never dispatches `CreateWorkOrder`. The intended flow is:

- Device offline > 2 hours -> Create work order with type `maintenance`, priority `high`
- Device battery < 20% -> Create work order with type `battery_replace`, priority `medium`

**Implementation status:** MISSING -- Both pieces exist independently but are not connected.

**Code reference:** `app/Jobs/CreateWorkOrder.php:17-35`, `app/Jobs/CheckDeviceHealth.php:43-44` (TODO), `app/Jobs/CheckDeviceHealth.php:65-66` (TODO)

---

### AUTO-005: Auto-Create Work Order from Alert

**Title:** Create maintenance work order linked to an alert

**Description:** `WorkOrderService::createFromAlert()` creates a work order linked to an existing alert, using the alert's site, device, and rule name for context. The title is auto-generated as `"WO: {rule_name} -- {device_name}"`. This method exists in the service but is never called automatically. Work orders from alerts must be created manually via the web UI.

**Implementation status:** PARTIAL -- Service method exists. No automatic trigger from alert flow.

**Code reference:** `app/Services/WorkOrders/WorkOrderService.php:15-33`

---

### AUTO-006: Work Order Completion -> Alert Resolution

**Title:** Completing a work order auto-resolves the linked alert

**Description:** `WorkOrderService::complete()` calls `$wo->complete()` (sets status to `completed`), then checks if the work order has a linked `alert_id`. If so, it calls `$wo->alert->resolve($userId, 'work_order')`, which transitions the alert to `resolved` with `resolution_type = 'work_order'`. This is the only cross-entity state transition in the system.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/WorkOrders/WorkOrderService.php:60-73`

---

### AUTO-007: Job Scheduling

**Title:** Scheduled job configuration

**Description:** The `routes/console.php` file contains only the default `inspire` command. None of the following jobs are scheduled:

| Job | Intended Schedule (per PRD) | Status |
|---|---|---|
| `CheckDeviceHealth` | Every 5 minutes | NOT SCHEDULED |
| `SendMorningSummary` | Every minute | NOT SCHEDULED |
| `SendRegionalSummary` | Every minute | NOT SCHEDULED |
| `SendCorporateSummary` | Daily at 8:00 AM (per timezone) | NOT SCHEDULED |
| `LearnDefrostPattern` | Daily for devices with >= 49h of data | NOT SCHEDULED |

All jobs are functionally complete but never execute because they are not registered in the scheduler.

**Implementation status:** MISSING

**Code reference:** `routes/console.php:1-8`

---

### AUTO-008: Sensor Reading Job Retry Policy

**Title:** Retry configuration for the data processing pipeline

**Description:** Jobs in the pipeline have different retry configurations reflecting their criticality:

| Job | Tries | Backoff (sec) | Rationale |
|---|---|---|---|
| `ProcessSensorReading` | 3 | 10 | Data loss prevention -- must persist readings |
| `EvaluateAlertRules` | 1 | -- | Single attempt -- missed evaluation resolved by next reading |
| `SendAlertNotification` | 3 | 30 | Delivery reliability -- Twilio/push can have transient failures |
| `EscalateAlert` | 2 | 60 | Moderate retry -- escalations are time-sensitive but not data-critical |
| `CreateWorkOrder` | 3 | -- | Work order creation should persist |
| `CheckDeviceHealth` | 1 | -- | Single run per schedule -- next run handles any missed devices |
| Summary jobs | 1 | -- | Single attempt per schedule window |
| `LearnDefrostPattern` | 1 | -- | Analysis is idempotent -- can rerun tomorrow |

**Implementation status:** IMPLEMENTED

**Code reference:** Individual job files in `app/Jobs/`

---

### AUTO-009: Sensor Auto-Activation on First Reading

**Title:** Devices automatically transition to active on first data

**Description:** When `ReadingStorageService::store()` processes a reading for a device with status `'pending'` or `'provisioned'`, the status is automatically updated to `'active'`. This eliminates the need for a manual activation step after device installation. The technician installs the sensor, it joins the LoRaWAN network and sends its first reading, and the platform automatically marks it active.

**Implementation status:** IMPLEMENTED

**Code reference:** `app/Services/Readings/ReadingStorageService.php:46-49`

---

## Appendix: Rule Index

### Operational Rules (OP)
| ID | Title | Status |
|---|---|---|
| OP-001 | MQTT Uplink Reception | IMPLEMENTED |
| OP-002 | Gateway Heartbeat Tracking | IMPLEMENTED |
| OP-003 | Payload Decoding | IMPLEMENTED |
| OP-004 | Reading Storage (Dual-Write) | IMPLEMENTED |
| OP-005 | Device Metadata Update on Reading | IMPLEMENTED |
| OP-006 | Job Pipeline Chain | IMPLEMENTED |
| OP-007 | Live Dashboard Broadcasting | IMPLEMENTED |
| OP-008 | Device Online/Offline Threshold | IMPLEMENTED |
| OP-009 | Device Health Check -- Offline Detection | PARTIAL |
| OP-010 | Device Health Check -- Low Battery Detection | PARTIAL |
| OP-011 | Device Health Check -- Scheduling | MISSING |
| OP-012 | Redis Latest Reading Cache | IMPLEMENTED |

### Alert Rules (ALT)
| ID | Title | Status |
|---|---|---|
| ALT-001 | Rule Evaluation Scope | IMPLEMENTED |
| ALT-002 | Condition Types | IMPLEMENTED |
| ALT-003 | Duration-Based Threshold Tracking | IMPLEMENTED |
| ALT-004 | Cooldown Period Enforcement | IMPLEMENTED |
| ALT-005 | Alert Creation and Data Snapshot | IMPLEMENTED |
| ALT-006 | Auto-Resolution on Normal Readings | IMPLEMENTED |
| ALT-007 | Alert Routing by Severity | IMPLEMENTED |
| ALT-008 | Alert Broadcast Fallback | IMPLEMENTED |
| ALT-009 | Escalation Guard | IMPLEMENTED |
| ALT-010 | Notification Delivery Guard | IMPLEMENTED |
| ALT-011 | Notification Audit Trail | IMPLEMENTED |
| ALT-012 | WhatsApp Alert Templates | IMPLEMENTED |
| ALT-013 | WhatsApp Acknowledgment via Webhook | IMPLEMENTED |
| ALT-014 | Push Notification Channel | IMPLEMENTED |
| ALT-015 | Email Notification Channel | STUB |
| ALT-016 | Defrost Suppression Logic | PARTIAL |
| ALT-017 | Twilio Graceful Degradation | IMPLEMENTED |

### State Machines (SM)
| ID | Title | Status |
|---|---|---|
| SM-001 | Alert Lifecycle | IMPLEMENTED |
| SM-002 | Work Order Lifecycle | IMPLEMENTED |
| SM-003 | Device Status Lifecycle | PARTIAL |
| SM-004 | Defrost Schedule Status Lifecycle | PARTIAL |
| SM-005 | Invoice Status Lifecycle | PARTIAL |
| SM-006 | Subscription Status | PARTIAL |

### Access & Authorization (AC)
| ID | Title | Status |
|---|---|---|
| AC-001 | Organization Scoping Middleware | IMPLEMENTED |
| AC-002 | Site Access Middleware | IMPLEMENTED |
| AC-003 | Super Admin Organization Switching | PARTIAL |
| AC-004 | Role Permission Matrix | IMPLEMENTED |
| AC-005 | Accessible Sites Resolution | IMPLEMENTED |
| AC-006 | Non-App Users (WhatsApp-Only) | IMPLEMENTED |

### Financial Rules (FIN)
| ID | Title | Status |
|---|---|---|
| FIN-001 | Subscription Base Fee | IMPLEMENTED |
| FIN-002 | Per-Sensor Pricing Map | IMPLEMENTED |
| FIN-003 | Monthly Total Calculation | PARTIAL |
| FIN-004 | Invoice Generation | STUB |
| FIN-005 | Payment Recording | STUB |
| FIN-006 | CFDI Timbrado | STUB |
| FIN-007 | SAP Export | IMPLEMENTED |
| FIN-008 | CONTPAQ Export | IMPLEMENTED |
| FIN-009 | Gateway Addon Billing | MISSING |

### Communication Rules (COM)
| ID | Title | Status |
|---|---|---|
| COM-001 | Morning Summary -- Store Level | PARTIAL |
| COM-002 | Morning Summary -- Regional Level | PARTIAL |
| COM-003 | Morning Summary -- Corporate Level | PARTIAL |
| COM-004 | WhatsApp Alert Delivery | IMPLEMENTED |
| COM-005 | Alert Broadcast via WebSocket | IMPLEMENTED |
| COM-006 | Alert Notification Rate Limiting | MISSING |

### Automation Rules (AUTO)
| ID | Title | Status |
|---|---|---|
| AUTO-001 | Defrost Pattern Learning | PARTIAL |
| AUTO-002 | Baseline Learning for Anomaly Detection | PARTIAL |
| AUTO-003 | Night Waste Detection | PARTIAL |
| AUTO-004 | Auto-Create Work Order from Health Check | MISSING |
| AUTO-005 | Auto-Create Work Order from Alert | PARTIAL |
| AUTO-006 | Work Order Completion -> Alert Resolution | IMPLEMENTED |
| AUTO-007 | Job Scheduling | MISSING |
| AUTO-008 | Sensor Reading Job Retry Policy | IMPLEMENTED |
| AUTO-009 | Sensor Auto-Activation on First Reading | IMPLEMENTED |

### Summary

| Category | Total | Implemented | Partial | Stub | Missing |
|---|---|---|---|---|---|
| Operational (OP) | 12 | 9 | 2 | 0 | 1 |
| Alert (ALT) | 17 | 13 | 1 | 2 | 0 |*
| State Machines (SM) | 6 | 2 | 4 | 0 | 0 |
| Access & Auth (AC) | 6 | 5 | 1 | 0 | 0 |
| Financial (FIN) | 9 | 4 | 1 | 3 | 1 |
| Communication (COM) | 6 | 2 | 3 | 0 | 1 |
| Automation (AUTO) | 9 | 3 | 4 | 0 | 2 |
| **Totals** | **65** | **38 (58%)** | **16 (25%)** | **5 (8%)** | **5 (8%)** |*

*ALT-016 counts as PARTIAL (suppression logic exists, not wired to evaluator).

---

*Generated from source code analysis. All file references and line numbers verified against commit `01bf12e` (main).*
