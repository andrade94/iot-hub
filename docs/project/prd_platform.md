# PRD — Astrea IoT Platform

> Product Requirements Document
> **Status:** v3.0
> **Stack:** Laravel 12 + Inertia.js + React + shadcn/ui + PostgreSQL + TimescaleDB
> **Mobile:** Expo (React Native) — Phase 2
> **Network Server:** ChirpStack Cloud
> **Deploy:** Laravel Forge | **Dev:** Laravel Herd
> **Date:** 2025-03-14 | **Updated:** 2026-03-19

---

## 1. Visión del Producto

**"Un command center. Todos los segmentos. Todos los clientes. Una plataforma."**

La plataforma Astrea es el puente entre sensores LoRaWAN y las personas que toman decisiones operativas. No es un dashboard técnico — es una herramienta de operaciones.

**Principios:**
1. **Tres interfaces, cada una con su propósito.** WhatsApp = emergencias y acknowledgment. App móvil = monitoreo diario y contexto. Web = configuración, análisis profundo y reportes.
2. **Una plataforma, módulos por segmento.** Cold Chain, Energy, Compliance, Industrial, IAQ — se activan por cliente.
3. **Command Center para Astrea.** Vemos todo: todos los clientes, todos los segmentos, toda la salud.
4. **El cliente solo ve lo suyo.** Multi-tenancy estricto con scoping a nivel de sitio.

---

## 2. Tech Stack

| Capa | Tecnología | Razón |
|---|---|---|
| **Backend** | Laravel 12 | PHP ecosystem maduro, queues, jobs, broadcasting, ORM |
| **Frontend** | React + Inertia.js | SPA-like UX sin API separada, SSR-ready |
| **UI Components** | shadcn/ui + Tailwind CSS 4 | Componentes de alta calidad, customizables, accessible |
| **Charts (Web)** | Tremor (built on Recharts) | Pre-built dashboard components, time-series |
| **Charts (Mobile)** | Victory Native | React Native charts for Expo app |
| **Database** | PostgreSQL 16 + TimescaleDB | Relacional + time-series en una sola DB |
| **Cache / Queue** | Redis | Laravel queues, sessions, rate limiting, últimas lecturas |
| **Network Server** | ChirpStack Cloud | Managed LoRaWAN network server — no self-hosting ops |
| **MQTT Client** | php-mqtt/laravel-client | Recibir uplinks de ChirpStack Cloud |
| **Real-time** | Laravel Reverb (WebSockets) | Live updates en dashboards sin polling |
| **Auth** | Laravel Sanctum + Spatie Permissions | Built-in, roles, site-level scoping |
| **Multi-tenancy** | Manual scoping (org_id + site_id) | Datos aislados por organización y sitio |
| **PDF Reports** | Browsershot (Puppeteer) | Pixel-perfect branded PDFs for COFEPRIS/NOM-251 |
| **WhatsApp** | Twilio API (MVP), Meta Cloud API (escala) | Alertas críticas + escalation |
| **Push Notifications** | Expo Push Notifications + Firebase FCM | Alertas en app móvil |
| **Mobile** | Expo (React Native) | App nativa iOS/Android — Phase 2 |
| **Maps** | Leaflet (open source) | Vista multi-sitio — free, no API billing |
| **Email** | Postmark | Transactional email (morning summaries, corporate digests, invoices) |
| **File Storage** | S3-compatible (DigitalOcean Spaces) | Reportes PDF, exports |
| **Monitoring** | Laravel Telescope + Sentry | Debug + error tracking |
| **Deployment** | Laravel Forge + DigitalOcean | Provisioning, SSL, deploys, cron |
| **Dev Environment** | Laravel Herd | PostgreSQL, Redis, PHP 8.4 local |

---

## 3. Database Architecture

### PostgreSQL + TimescaleDB

**Why one database, not two:**
- TimescaleDB es una extensión de PostgreSQL, no una DB separada
- Misma conexión, mismo backup, mismo ORM (Eloquent)
- ChirpStack ya usa PostgreSQL
- Simplifica el stack enormemente

### Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CORE TABLES (PostgreSQL)                 │
│                                                              │
│  organizations ─┬─ sites ─┬─ gateways                       │
│                 │         ├─ devices (sensors)               │
│                 │         ├─ floor_plans                     │
│                 │         ├─ site_modules                    │
│                 │         ├─ site_recipe_overrides           │
│                 │         ├─ alert_rules                     │
│                 │         ├─ escalation_chains (→ users)     │
│                 │         ├─ defrost_schedules               │
│                 │         └─ work_orders ─┬─ photos          │
│                 │                         └─ notes           │
│                 │                                            │
│                 ├─ users ─┬─ user_sites (site scoping)      │
│                 │         └─ push_tokens                     │
│                 ├─ billing_profiles                          │
│                 ├─ subscriptions ── line_items               │
│                 ├─ invoices                                  │
│                 └─ activity_logs                             │
│                                                              │
│  modules ── recipes                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                TIME-SERIES (TimescaleDB hypertable)          │
│                                                              │
│  sensor_readings (device_id, time, metric, value, unit)     │
│  ► Continuous aggregates: 15m, 1h, 1d                        │
│  ► Compressed after 7 days (90%+ reduction)                  │
│  ► Retention: raw 12mo, 15m 3mo, 1h 5yr, 1d 10yr            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                ALERTS (PostgreSQL)                            │
│                                                              │
│  alerts ─┬─ alert_acknowledgments                           │
│           ├─ alert_escalations                               │
│           └─ alert_notifications (log of sent messages)      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                REDIS (hot cache + state)                      │
│                                                              │
│  device:{id}:latest        — current sensor readings         │
│  alert_rule_state:{r}:{d}  — in-progress threshold breaches │
│  queues, sessions, Reverb                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Tables

```sql
-- Organizations (clients)
organizations: id, name, slug, segment(primary), plan, settings(json), logo,
               default_opening_hour(time), default_timezone
  -- segment: primary segment for Command Center filtering (retail, cadena_fria, industrial, etc.)
  -- Sites can override with their own segment (e.g., org=retail but one site=cadena_fria for CEDIS)

-- Sites
sites: id, org_id, name, address, lat, lng, timezone, opening_hour(time),
       segment_override(nullable), install_date, status, floor_plan_count
  -- opening_hour: defaults to org.default_opening_hour, overridable per site
  -- segment_override: if set, overrides org.segment for this site (e.g., CEDIS = cadena_fria in a retail org)
  -- Used for morning summary delivery time and module/recipe defaults

-- Gateways
gateways: id, site_id, model, serial, chirpstack_id, last_seen_at, status, is_addon(bool)
  -- is_addon: false = included in Base, true = billed as addon ($2,500/mes)

-- Devices (sensors)
devices: id, site_id, gateway_id, model, dev_eui, app_key, name, zone, floor_id(nullable),
         floor_x(float), floor_y(float), recipe_id, installed_at, battery_pct,
         rssi, last_reading_at, status, provisioned_at, provisioned_by,
         replaced_device_id(nullable)
  -- app_key: OTAA join key (printed on sensor label). Sent to ChirpStack during provisioning.
  --          Stored encrypted. Only used during device registration.
  -- replaced_device_id: links to the old device this one replaced (history stays with old dev_eui)

-- Sensor Readings (TimescaleDB hypertable)
sensor_readings: time, device_id, metric(varchar), value(double), unit(varchar)
  -- Metrics: temperature, humidity, current, door_status, co2, pressure, etc.
  -- Partitioned by time (weekly chunks)
  -- Compression after 7 days
  -- Retention: raw 12 months, continuous aggregate (1hr) 5 years

-- Alert Rules
alert_rules: id, site_id, device_id(nullable), name, type(simple|correlation|baseline),
             conditions(json), severity, cooldown_minutes, active

-- Alert Rule States (Redis — tracks in-progress threshold breaches)
-- NOT a DB table — stored in Redis for speed:
--   alert_rule_state:{rule_id}:{device_id} = {first_breach_at, reading_count, last_value}
--   Duration check: alert fires when (now - first_breach_at) >= rule.duration_min
--   Reset: if a reading comes in BELOW threshold, delete the key (breach ended)
--   This avoids alerting on momentary spikes — only sustained breaches trigger alerts

-- Alerts (instances)
alerts: id, rule_id, site_id, device_id, severity, status(active|acknowledged|resolved|dismissed),
        triggered_at, acknowledged_at, resolved_at, resolved_by,
        resolution_type(auto|manual|work_order|dismissed), data(json)
  -- data contains: {
  --   "trigger_reading": {"value": -8.5, "metric": "temperature", "time": "..."},
  --   "threshold": -12, "condition": "above", "duration_min": 10,
  --   "rule_snapshot": {...}  ← rule conditions at time of trigger (in case rule is later edited)
  -- }
  -- resolution_type:
  --   auto = reading returned to normal range (2 consecutive normal readings)
  --   manual = user clicked "resolve" in app/web
  --   work_order = work order linked to this alert was completed
  --   dismissed = user silenced without action (flagged for review)

-- User-Site Assignment (site-level scoping)
user_sites: id, user_id, site_id, role, assigned_at, assigned_by

-- Users (merged with contacts — one table for everyone)
users: id, org_id, name, email, phone, whatsapp_phone(nullable), password(nullable),
       has_app_access(bool), escalation_level(1|2|3), created_at
  -- has_app_access=false: user exists only for WhatsApp alerts (e.g., night guard, external repair tech)
  -- has_app_access=true: user can log into web/mobile app
  -- password is nullable: non-app users don't have one
  -- whatsapp_phone: the number that receives WhatsApp alerts (can differ from phone)

-- Escalation Chains (references users directly, not a separate contacts table)
escalation_chains: id, site_id, level, user_id, delay_minutes, channel(whatsapp|push|sms|email)

-- Alert Notifications (log of every message sent)
alert_notifications: id, alert_id, user_id, channel(whatsapp|push|sms|email),
                     status(sent|delivered|failed), sent_at, delivered_at, error(text nullable)
  -- Audit trail: every WhatsApp, push, SMS, email sent for an alert

-- Defrost Schedules (auto-learned per device)
defrost_schedules: id, device_id, site_id, status(learning|detected|confirmed|manual),
                   windows(json), detected_at, confirmed_by, confirmed_at

-- Push Notification Tokens (for Expo app)
push_tokens: id, user_id, expo_token, device_type(ios|android), active, created_at

-- Floor Plans (per site, supports multi-floor)
floor_plans: id, site_id, name(e.g. "Planta Baja", "Piso 1"), floor_number,
             image_path, width_px, height_px, created_at
  -- Sensors are placed via drag-drop: device.floor_id + floor_x + floor_y

-- Work Orders (generated from alerts or manual)
work_orders: id, site_id, alert_id(nullable), device_id(nullable),
             type(battery_replace|sensor_replace|maintenance|inspection|install),
             title, description, status(open|assigned|in_progress|completed|cancelled),
             priority(low|medium|high|urgent), assigned_to(user_id),
             created_by, created_at, assigned_at, completed_at
work_order_photos: id, work_order_id, photo_path, caption, uploaded_by, uploaded_at
  -- Technician uploads photos (e.g. photo of replaced sensor, installation)
work_order_notes: id, work_order_id, user_id, note, created_at

-- Activity Log (audit trail for compliance)
activity_logs: id, org_id, site_id(nullable), user_id, action, subject_type, subject_id,
               changes(json), ip_address, created_at
  -- Tracks: alert rule changes, escalation chain edits, alert acks, device config,
  --         user role changes, recipe modifications, work order updates
  -- Uses Spatie Activity Log package

-- Modules
modules: id, slug(cold_chain|energy|compliance|industrial|iaq|safety|people), name
site_modules: id, site_id, module_id, activated_at, config(json)

-- Recipes (alert templates per sensor model + use case)
recipes: id, module_id, sensor_model, name, default_rules(json), description, editable(bool)
  -- Seeded by Astrea with sensible defaults per sensor model + vertical
  -- org_admin can: adjust thresholds, enable/disable individual rules
  -- org_admin CANNOT: delete Astrea-seeded recipes (only deactivate)
  -- super_admin can: create new recipes, edit all fields

-- Recipe Overrides (per-site customizations by org_admin)
site_recipe_overrides: id, site_id, recipe_id, overridden_rules(json), overridden_by, created_at
  -- Stores only the CHANGED fields — original recipe stays intact for other sites
  -- overridden_rules: [{"rule_index": 0, "threshold": -10, "duration_min": 15}, ...]

-- Billing Profiles (multiple per org — client decides which entity to invoice)
billing_profiles: id, org_id, name, rfc, razon_social, regimen_fiscal,
                  direccion_fiscal(json), uso_cfdi, email_facturacion, is_default(bool)
  -- An org can have multiple RFCs / legal entities
  -- Client tells Astrea: "invoice sites 1-20 to RFC X, sites 21-50 to RFC Y"
  -- direccion_fiscal: {calle, numero, colonia, cp, municipio, estado, pais}

-- Subscriptions & Billing (B2B: factura + SPEI, no payment processor)
subscriptions: id, org_id, billing_profile_id, base_fee, discount_pct, status,
               started_at, contract_type(monthly|annual)
subscription_items: id, subscription_id, device_id, sensor_model, monthly_fee
invoices: id, org_id, billing_profile_id, period, subtotal, iva, total,
          status(draft|sent|paid|overdue), cfdi_uuid, pdf_path, xml_path,
          paid_at, payment_method(spei|transfer)
```

### TimescaleDB Setup

```sql
-- Create hypertable (weekly chunks for MVP, switch to daily at 3000+ sensors)
SELECT create_hypertable('sensor_readings', 'time',
  chunk_time_interval => INTERVAL '7 days'
);

-- Continuous aggregate: 15-minute (for 24h detailed charts)
CREATE MATERIALIZED VIEW sensor_readings_15m
WITH (timescaledb.continuous) AS
SELECT device_id, time_bucket('15 minutes', time) AS bucket,
       metric, avg(value), min(value), max(value), count(*)
FROM sensor_readings
GROUP BY device_id, bucket, metric;

-- Continuous aggregate: 1-hour (for 7d and 30d charts)
CREATE MATERIALIZED VIEW sensor_readings_1h
WITH (timescaledb.continuous) AS
SELECT device_id, time_bucket('1 hour', time) AS bucket,
       metric, avg(value), min(value), max(value), count(*)
FROM sensor_readings
GROUP BY device_id, bucket, metric;

-- Continuous aggregate: 1-day (for monthly/yearly KPI dashboards)
CREATE MATERIALIZED VIEW sensor_readings_1d
WITH (timescaledb.continuous) AS
SELECT device_id, time_bucket('1 day', time) AS bucket,
       metric, avg(value), min(value), max(value), count(*)
FROM sensor_readings
GROUP BY device_id, bucket, metric;

-- Compression policy (after 7 days — reduces storage 90%+)
ALTER TABLE sensor_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id,metric',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('sensor_readings', INTERVAL '7 days');

-- Retention policy (raw: 12 months, aggregates: 5 years)
SELECT add_retention_policy('sensor_readings', INTERVAL '12 months');
-- Note: continuous aggregates are NOT affected by retention policy on raw data.
-- They persist independently. Add separate retention if needed:
-- SELECT add_retention_policy('sensor_readings_15m', INTERVAL '3 months');
-- SELECT add_retention_policy('sensor_readings_1h', INTERVAL '5 years');
-- SELECT add_retention_policy('sensor_readings_1d', INTERVAL '10 years');
```

### Redis Cache: Latest Readings (hot path)

90% of dashboard queries are "what's the current reading?" — these must **never** hit TimescaleDB.

```
On every new reading (in ProcessSensorReading job):
  1. Write to TimescaleDB (permanent storage)
  2. Write to Redis:
     HSET device:{device_id}:latest  metric  value  time  timestamp
     EXPIRE device:{device_id}:latest 900   (15 min TTL — if no reading, key disappears = offline)

Dashboard loads:
  → HGETALL device:{device_id}:latest  (< 1ms, no DB query)

Device list page:
  → MGET for all devices in site  (< 5ms for 30 sensors)
```

This reduces database reads by ~90%. TimescaleDB is only queried for historical charts.

### ReadingQueryService: Auto-Resolution Selection

```php
// ReadingQueryService automatically picks the right resolution:
//
// Time range requested    → Data source              → Why
// Last 1h                 → Raw sensor_readings       → Full detail needed
// Last 24h                → sensor_readings_15m       → ~96 points per sensor (smooth)
// Last 7d                 → sensor_readings_1h        → ~168 points per sensor
// Last 30d                → sensor_readings_1h        → ~720 points per sensor
// Last 1y                 → sensor_readings_1d        → ~365 points per sensor
//
// This keeps all chart queries fast (<100ms) regardless of scale.
```

### Database Indexes

```sql
-- Core query patterns need explicit indexes:
CREATE INDEX idx_devices_site_status ON devices(site_id, status);
CREATE INDEX idx_alerts_site_status_time ON alerts(site_id, status, triggered_at DESC);
CREATE INDEX idx_work_orders_assigned_status ON work_orders(assigned_to, status);
CREATE INDEX idx_user_sites_user ON user_sites(user_id);
CREATE INDEX idx_user_sites_site ON user_sites(site_id);
CREATE INDEX idx_activity_logs_org_time ON activity_logs(org_id, created_at DESC);
CREATE INDEX idx_alert_notifications_alert ON alert_notifications(alert_id, created_at DESC);
CREATE INDEX idx_defrost_schedules_device ON defrost_schedules(device_id, status);
-- TimescaleDB auto-creates time-based indexes on hypertables
-- Continuous aggregates have their own indexes
```

### Scalability Roadmap

| Scale | Sensors | Rows/day | Server spec | Action needed |
|---|---|---|---|---|
| **MVP (0-50 sites)** | <750 | <540K | 4 vCPU, 8GB, 100GB | Current PRD spec |
| **Growth (50-200)** | 750-3K | 540K-2.16M | 4 vCPU, 16GB, 250GB | Resize DO droplet |
| **Scale (200-500)** | 3K-7.5K | 2.16M-5.4M | 8 vCPU, 32GB, 500GB | Switch to daily chunks |
| **Enterprise (500-1000)** | 7.5K-15K | 5.4M-10.8M | 16 vCPU, 64GB, 1TB | Consider read replica |

> **Key insight:** Compression (90%+ reduction) + continuous aggregates (pre-computed) + Redis cache (hot path)
> means the actual database load stays manageable even at 10,000+ sensors.
> TimescaleDB handles billions of rows — the bottleneck will be your wallet for server costs, not the technology.

---

## 4. Users & Roles

| Role | Access | Personas | Site Scoping |
|---|---|---|---|
| **super_admin** | Everything. All orgs. Command Center. | Astrea team | All sites, all orgs |
| **org_admin** | Their org: all sites, billing, users, config. Assigns regionals to sites. | Director de Operaciones del cliente | All sites in their org |
| **site_manager** | Multiple assigned sites: dashboards, alerts, reports, compare sites | Gerente Regional | Multiple sites (assigned by org_admin) |
| **site_viewer** | Their single site: read-only dashboards, reports, acknowledge alerts, request maintenance | Gerente de Tienda | Single site (assigned to their store) |
| **technician** | Assigned sites: device status, battery, signal, historical data, alert detail | Técnico de mantenimiento | Multiple sites (assigned by org_admin) |

### Site-Level Scoping

Implemented with **Spatie Laravel Permission** + `user_sites` pivot table.

```sql
-- User-site assignment (replaces simple org_id scoping)
user_sites: id, user_id, site_id, role, assigned_at, assigned_by
  -- role mirrors the Spatie role but scoped to this specific site
  -- org_admin sees all sites in org (no entries needed in user_sites)
  -- site_manager has multiple entries (one per assigned site)
  -- site_viewer has exactly one entry (their store)
  -- technician has multiple entries (their assigned sites)
```

**Assignment flow:**
- `org_admin` logs into web platform → Settings → Users → assigns a user to specific sites
- A `site_manager` (gerente regional) gets assigned to their 10-15 stores
- A `site_viewer` (gerente de tienda) gets assigned to their single store
- A `technician` gets assigned to the sites they service
- Non-app users (night guard, external repair company) are created with `has_app_access=false` — they only receive WhatsApp alerts, no login needed

### Notification Channels by Role

| Role | WhatsApp | Push (App) | Web | Use Case |
|---|---|---|---|---|
| **site_viewer** | Critical/high alerts | All alerts | Daily monitoring | "Algo pasa en MI tienda" |
| **site_manager** | Critical only (escalation) | High + trends | Compare sites, KPIs | "Cómo van MIS tiendas" |
| **technician** | Device offline/battery | Device alerts | Diagnostics | "Qué tengo que arreglar" |
| **org_admin** | Never (escalation only) | Weekly summary | Full config + reports | "Cómo va la operación" |

---

## 5. Platform Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Sensores    │────▶│  Gateways    │────▶│  ChirpStack      │
│  LoRaWAN     │     │  UG65 (4G)   │     │  CLOUD (managed) │
│  (campo)     │     │  SG50 (solar)│     │  No self-hosting  │
└──────────────┘     └──────────────┘     └──────┬───────────┘
                                                  │
                                    MQTT          │
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     LARAVEL 12 APPLICATION                   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ MQTT        │  │ Rules Engine │  │ Alert Router      │  │
│  │ Listener    │→ │ (Laravel Job)│→ │                   │  │
│  │ (Queue)     │  │ + Defrost    │  │ ┌─WhatsApp(Twilio)│  │
│  └─────────────┘  │   Detection  │  │ ├─Push (Expo/FCM) │  │
│                    └──────────────┘  │ └─Web (Reverb)    │  │
│                                      └───────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Inertia.js  │  │ REST API     │  │ Report Generator  │  │
│  │ Controllers │  │ (Sanctum)    │  │ (PDF via          │  │
│  │ → React SPA │  │ → Mobile app │  │  Browsershot)     │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Laravel Reverb (WebSockets)                             ││
│  │ → Live sensor updates, real-time alert notifications    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  PostgreSQL + TimescaleDB ◄──── Redis (cache/queue)         │
└─────────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Web App    │ │ Mobile App │ │ WhatsApp   │
│ (Inertia + │ │ (Expo)     │ │ Business   │
│  React +   │ │ Phase 2    │ │ API        │
│  shadcn)   │ │ iOS+Android│ │ Emergencias│
│ Config +   │ │ Monitoreo  │ │ + Ack flow │
│ Analytics  │ │ diario     │ │            │
└────────────┘ └────────────┘ └────────────┘
```

---

## 6. Segment Modules

### Module: Cold Chain (retail, conveniencia, farmacias, cadena fría, foodservice)

| Feature | Description |
|---|---|
| Temperature zones | Group sensors into named zones (walk-in, vitrinas, freezer) |
| Zone health status | Green/yellow/red per zone based on current temp vs range |
| Defrost cycle detection | Auto-learn defrost patterns in 48 hours (see below) |
| Cold chain timeline | Visual timeline showing all temp excursions per zone over 24h/7d/30d |
| HACCP report | Auto-generated temperature log with excursions flagged, PDF export |
| Temperature heatmap | Floor plan with color-coded zones |

#### Defrost Cycle Detection (Phase 4 — no ML needed)

Commercial refrigerators defrost 2-4 times/day on fixed schedules. The EM300-TH sees a temperature spike that looks like a failure but isn't. Without defrost detection, every installation generates 8-16 false alarms/day — destroying client trust.

**Auto-learning flow (48 hours):**

```
HOUR 0-48: LEARNING MODE
  → System collects all temperature spikes per device
  → A spike = temp rises >5°C above baseline within 30 min
  → Tag each spike: time, duration, peak temp, recovery time

HOUR 49: PATTERN DETECTION
  → For each device, look at spikes from Day 1 vs Day 2
  → DEFROST if ALL true:
    1. Spike happens within ±30 min of same time on both days
    2. Duration is 15-45 minutes
    3. Temperature returns to normal range within 60 minutes
    4. Pattern repeats on both days
  → Auto-generate defrost_schedule for this device
  → Notify site_viewer: "Detectamos 4 ciclos de deshielo diarios
    en [device]. ¿Es correcto?" → Confirm / Adjust

FROM HOUR 49 ON: SUPPRESS + PROTECT
  → Suppress alerts during detected defrost windows (±15 min buffer)
  → STILL alert if temp doesn't recover after 60 min (failed defrost = real problem)
  → Continue learning: adjust windows if schedule drifts over time
```

**During learning mode (first 48 hours):**
- Still send alerts, but with softer messaging:
  - "Temperatura alta en [device] — puede ser deshielo normal (sistema en calibración, primeros 2 días)"
- This way a real failure isn't missed, but the gerente knows it's probably fine

**Database:**

```sql
defrost_schedules: id, device_id, site_id, status(learning|detected|confirmed|manual),
                   windows(json), detected_at, confirmed_by, confirmed_at
  -- windows: [{"time": "02:00", "duration_min": 25, "buffer_min": 15}, ...]
  -- status: learning (first 48h), detected (auto), confirmed (user said yes), manual (user input)
```

### Module: Energy Analytics (all segments)

| Feature | Description |
|---|---|
| Consumption dashboard | kWh per circuit (CT101), daily/weekly/monthly |
| Baseline comparison | This week vs last week, this month vs last month |
| Anomaly detection | Alerts when consumption exceeds baseline by X% |
| Compressor correlation | CT101 current + EM300-TH temp = degradation detection |
| Cost calculator | kWh × CFE tariff = MXN cost per period |
| Night waste detection | Consumption 11pm-7am vs expected idle |

### Module: Compliance (NOM-251, COFEPRIS, NOM-072, SENASICA)

| Feature | Description |
|---|---|
| Continuous temperature log | Per sensor, per zone — with min/max/avg per period |
| Excursion report | List of all temp excursions with duration, peak temp, resolution |
| Audit-ready PDF | Branded PDF with client logo, ready for COFEPRIS inspector in 2 min |
| Regulatory calendar | Reminders for upcoming audits, certificate renewals |
| Corrective actions log | Link alerts to corrective actions for audit trail |

### Module: Industrial (manufacturing plants)

| Feature | Description |
|---|---|
| Vibration analysis | EM500-ACC trends, FFT if available, threshold alerts |
| Compressed air monitoring | Pressure monitoring, leak detection via consumption patterns |
| Production line status | Machine on/off via CT101, downtime tracking |
| Maintenance scheduler | CT101 degradation → auto-generate maintenance work orders |

### Module: IAQ / HVAC (inmobiliario)

| Feature | Description |
|---|---|
| Indoor air quality dashboard | CO2, temp, humidity per floor/zone (AM307/AM103L) |
| Occupancy-based HVAC | VS121 people count → HVAC should be on/off |
| LEED/WELL scoring | Track metrics against LEED/WELL certification thresholds |
| Tenant comfort report | Monthly report per floor with IAQ metrics |

### Module: Safety (foodservice, industrial)

| Feature | Description |
|---|---|
| Gas leak detection | GS101 alerts with immediate escalation |
| Emergency protocol | Auto-trigger emergency contact chain on gas/safety alerts |
| Incident log | Record incidents with timeline, resolution, root cause |

### Module: People & Flow (inmobiliario, retail)

| Feature | Description |
|---|---|
| Occupancy heatmap | VS121 people count by zone over time |
| Traffic patterns | Peak hours, dead hours, day-over-day comparison |
| Staffing recommendations | Suggested staff levels based on historical traffic |

---

## 7. Pages & Components (Inertia + React + shadcn)

### Layout Structure

```
App Layout
├── Sidebar (shadcn NavigationMenu)
│   ├── Command Center (super_admin only)
│   ├── Dashboard
│   ├── Sites
│   ├── Alerts
│   ├── Reports
│   ├── Devices
│   ├── Settings
│   └── Billing
├── TopBar
│   ├── Org switcher (super_admin)
│   ├── Search (Command+K, shadcn CommandDialog)
│   ├── Notification bell (live via Reverb)
│   └── User menu
└── Main content area
```

### Page Inventory

#### A. Command Center (super_admin only)

| Page | Route | Components | Description |
|---|---|---|---|
| Global Overview | `/command-center` | Map, StatsCards, AlertFeed, OrgTable | All orgs, all sites, all alerts |
| Organization Detail | `/command-center/orgs/{id}` | OrgHeader, SitesList, MRRChart, HealthGrid | Drill into one client |
| Device Health | `/command-center/devices` | DataTable, filters, BatteryChart, OfflineList | All devices across all orgs |
| Revenue Dashboard | `/command-center/revenue` | MRRChart, SegmentBreakdown, ChurnRisk | Financial overview |
| Alert Queue | `/command-center/alerts` | AlertTable, filters, AssignDropdown | All active alerts, assign to support tech |
| Work Orders | `/command-center/work-orders` | WorkOrderTable, StatusFilter, AssignDropdown | All work orders, assign/track |
| Field Dispatch | `/command-center/dispatch` | Map, TechList, VisitSchedule, WorkOrderMap | Which sites need visits, route optimization |

#### B. Client Dashboard

| Page | Route | Components | Description |
|---|---|---|---|
| Dashboard | `/dashboard` | Map, SiteCards, KPIRow, AlertSummary | Multi-site overview for client |
| Site Detail | `/sites/{id}` | FloorPlanLive, SensorGrid, ZoneCards, MorningSummary | Single site with all sensors + floor plan view |
| Site > Zone | `/sites/{id}/zones/{zone}` | TempChart, SensorList, AlertTimeline | Single zone detail |
| Sensor Detail | `/sites/{id}/devices/{id}` | ReadingChart (24h/7d/30d), StatusCard, AlertHistory | Single sensor deep dive |

#### C. Alerts

| Page | Route | Components | Description |
|---|---|---|---|
| Alert List | `/alerts` | AlertTable, SeverityFilter, StatusFilter, DateRange | All alerts for the org |
| Alert Detail | `/alerts/{id}` | AlertHeader, Timeline, SensorChart, Actions, EscalationLog | Full alert context |

#### D. Reports

| Page | Route | Components | Description |
|---|---|---|---|
| Report Builder | `/reports` | ModuleSelector, DateRange, ZoneSelector, GenerateButton | Select what report to generate |
| Temperature Report | `/reports/temperature` | TempTable, TempChart, ExcursionList, PDFDownload | COFEPRIS / NOM-251 |
| Energy Report | `/reports/energy` | ConsumptionChart, CostTable, ComparisonChart, PDFDownload | CFE / energy analysis |
| Monthly Summary | `/reports/summary` | KPICards, AlertStats, SavingsEstimate, PDFDownload | Executive summary |

#### E. Settings

| Page | Route | Components | Description |
|---|---|---|---|
| Organization | `/settings/organization` | OrgForm, LogoUpload, TimezoneSelect | Org settings |
| Sites | `/settings/sites` | SiteTable, SiteForm, ModuleActivation | Manage sites |
| Site Onboarding | `/settings/sites/onboard` | OnboardWizard, GatewayRegistration, DeviceScanner | New site setup wizard |
| Floor Plans | `/settings/sites/{id}/floor-plans` | FloorPlanUpload, SensorDragDrop, FloorSelector | Upload 2D plans + place sensors |
| Devices | `/settings/devices` | DeviceTable, DeviceForm, RecipeAssign, BatchImport | Manage sensors |
| Alert Rules | `/settings/rules` | RuleTable, RuleBuilder, RecipeEditor | Configure alert rules + edit recipe thresholds |
| Users & Escalation | `/settings/users` | UserTable, RoleAssign, InviteForm, WhatsAppToggle, EscalationBuilder | Manage users + who gets alerted (merged) |
| Modules | `/settings/modules` | ModuleGrid, ActivateToggle, ModuleConfig | Activate segment modules |
| Billing Profiles | `/settings/billing/profiles` | BillingProfileForm, RFCInput, DefaultToggle | Manage RFC / razón social per entity |
| Billing | `/settings/billing` | PlanCard, InvoiceTable, UsageChart, ProfileSelector | Subscription & invoices |

---

## 8. Data Flow

### Sensor → Alert → Notification (< 60 seconds)

```
1. Sensor sends LoRaWAN uplink every 5 min
2. Gateway (UG65) receives, forwards to ChirpStack Cloud via 4G
3. ChirpStack Cloud decodes payload (Milesight codec) → publishes decoded JSON to MQTT topic
4. Laravel MQTT Listener (running as queue worker) receives decoded JSON message
5. Job: ProcessSensorReading
   → Normalize + validate decoded payload (MilesightDecoder = normalizer, not raw byte decoder)
   → Write to sensor_readings (TimescaleDB)
   → Write to Redis: HSET device:{id}:latest (hot cache for dashboards)
   → Update device.last_reading_at, device.battery_pct
   → Broadcast to Reverb (live dashboard update)
6. Job: EvaluateAlertRules
   → Load active rules for this device
   → CHECK defrost_schedule: is this device in a defrost window?
     → YES + temp rising normally → suppress, tag as defrost event
     → YES + temp not recovering after 60 min → ALERT (failed defrost)
     → NO → evaluate normally
   → If device is in learning mode (first 48h): alert with soft message
   → Evaluate conditions (threshold, duration, correlation)
   → If triggered: create Alert record with data snapshot (reading + rule conditions)
   → If reading returns to normal: check if 2 consecutive readings are in range
     → YES: auto-resolve alert (resolution_type=auto), send alert_resolved WhatsApp
     → NO: keep alert active
7. Job: RouteAlert
   → Determine severity → select channels:
     → CRITICAL/HIGH: WhatsApp (Twilio) + Push (Expo) + Reverb
     → MEDIUM: Push (Expo) + Reverb
     → LOW: Reverb only (visible in app/web dashboard)
   → Look up escalation chain for this site
   → Send to level 1 contacts (respecting channel preferences per role)
   → Log notification in alert_notifications
   → Schedule escalation job (if no ack in 15 min → level 2)
8. Job: LearnDefrostPattern (runs once at hour 49 per new device)
   → Analyze first 48h of temperature data
   → Detect repeating spike patterns
   → Create defrost_schedule with status=detected
   → Notify site_viewer for confirmation
```

### Laravel Queue Workers

| Worker | Queue | Concurrency | Purpose |
|---|---|---|---|
| mqtt-listener | mqtt | 1 | Persistent MQTT connection to ChirpStack Cloud |
| sensor-processor | readings | 3 | Decode + store + evaluate rules + defrost check |
| alert-router | alerts | 2 | WhatsApp + Push + SMS delivery |
| report-generator | reports | 1 | PDF generation (CPU-intensive) |
| scheduled | default | 1 | Cron jobs (daily summaries, device health, defrost learning) |

---

## 9. Site Onboarding & Device Provisioning

### Goal: New site live in < 30 minutes

The Astrea field tech arrives at the site with gateway + sensors. Everything should be registerable from a mobile device or laptop on-site.

### Provisioning Flow

```
PRE-VISIT (Astrea support tech, web platform):
  1. Create Organization (if new client)
  2. Create Site: name, address, timezone, opening_hour
  3. Upload floor plan(s) — 2D image per floor
  4. Pre-configure: select modules, assign recipes based on segment

ON-SITE (Astrea field tech, mobile app or web):
  5. Install gateway → power on → verify 4G connectivity
  6. Register gateway: enter serial number or scan barcode
     → Platform calls ChirpStack Cloud REST API to register gateway
     → Verify: gateway appears as "online" in ChirpStack
  7. For each sensor:
     a. Scan dev_eui (barcode on sensor label) or type manually
     b. Input app_key (OTAA join key — printed on sensor label/box)
     c. Select sensor model from dropdown (EM300-TH, CT101, etc.)
     d. Assign to zone (e.g. "Walk-in Cooler 1", "Vitrina Lácteos")
     e. Assign to floor plan → drag-drop placement on 2D image
     f. Platform calls ChirpStack Cloud REST API:
        → Create device in application with dev_eui + app_key
        → Set device profile (Milesight, OTAA, class A)
        → Device joins network automatically (OTAA)
     g. Wait for first uplink (usually < 5 min)
     h. Verify: reading appears in platform
  8. Auto-apply recipe based on sensor model + module
     → Default alert rules activated
     → Defrost learning mode starts (for temp sensors)
  9. Assign users to site: who gets WhatsApp/push alerts (escalation chain)
  10. Mark site as "active"

POST-INSTALL (automated):
  → Device health check starts monitoring
  → First morning summary sent next day at opening_hour
  → Defrost patterns detected at hour 49
```

### ChirpStack Cloud Integration

```
App\Services\ChirpStack\DeviceProvisioner
  → createGateway(serial, site) — POST /api/gateways
  → createDevice(devEui, model, site) — POST /api/devices
  → getDeviceStatus(devEui) — GET /api/devices/{devEui}
  → deleteDevice(devEui) — DELETE /api/devices/{devEui}

Auth: ChirpStack Cloud API key stored in .env (CHIRPSTACK_API_KEY)
Endpoint: CHIRPSTACK_API_URL (e.g. https://nam1.cloud.chirpstack.com)
```

---

## 10. Morning Summary ("What happened last night")

Three levels of summary, each delivered at the appropriate time:

### Store-level summary (site_viewer — gerente de tienda)

**When:** At site `opening_hour` (default 7:00 AM local time, overridable per site)
**Channel:** Push notification (app) with link to detail
**Content:**
```
Buenos días, [Tienda Centro].
Resumen nocturno (11pm - 7am):

✅ Temperaturas: todas en rango
⚠️ 1 alerta: Walk-in Cooler 2 — temp alta 22:45, resuelta 23:10
🚪 Puerta cuarto frío: 2 aperturas (normal)
⚡ Energía: consumo nocturno normal
🔋 Sensores: todos operando (15/15)
```

### Regional summary (site_manager — gerente regional)

**When:** 30 minutes after the earliest `opening_hour` of their assigned sites
**Channel:** Push notification + email digest
**Content:** One consolidated view of all their sites:
```
Buenos días, [Regional Norte — 12 tiendas].

🟢 10 tiendas sin incidentes
🟡 1 tienda con alerta resuelta (Centro — Walk-in Cooler 2)
🔴 1 tienda requiere atención (Poniente — sensor offline desde 3am)

Top issues:
  1. Tienda Poniente: EM300-TH #7 offline — orden de trabajo creada
  2. Tienda Centro: excursión temp 22:45-23:10 (resuelta automáticamente)
```

### Corporate summary (org_admin — director de operaciones)

**When:** 8:00 AM (configurable per org)
**Channel:** Email only (not push — this is a digest, not urgent)
**Content:** Executive overview:
```
Resumen diario — [Cadena XYZ] — 50 tiendas

Salud general: 96% (48/50 sin incidentes)
Alertas últimas 24h: 7 (5 resueltas, 2 pendientes)
Sensores offline: 3 (órdenes de trabajo asignadas)
Tiempo promedio de respuesta: 12 min

Tiendas que requieren atención:
  1. Tienda Poniente — sensor offline
  2. Tienda Sur — 2 alertas pendientes de acknowledge
```

### Timezone handling

- All timestamps stored in UTC in database
- `SendMorningSummary` job runs every minute, checks: "is it `opening_hour` in any site's timezone right now?"
- All user-facing content (WhatsApp, push, email, PDFs, dashboard) converted to site local time
- Regional summary uses the earliest opening hour among assigned sites + 30 min buffer

---

## 11. Work Orders

### Auto-generated work orders

| Trigger | Type | Priority | Assigned to |
|---|---|---|---|
| Sensor battery < 20% | `battery_replace` | medium | Technician assigned to site |
| Sensor offline > 2 hours | `sensor_replace` | high | Technician assigned to site |
| Gateway offline > 30 min | `maintenance` | urgent | Technician assigned to site |
| Failed defrost (temp didn't recover) | `maintenance` | high | Technician assigned to site |
| Manual (from Command Center) | any | any | Selected technician |

### Work order lifecycle

```
OPEN → ASSIGNED → IN_PROGRESS → COMPLETED
                               → CANCELLED

Field tech flow (mobile app):
  1. See "My Work Orders" list (filtered by assigned sites)
  2. Tap work order → see details, alert context, device info
  3. Mark "In Progress"
  4. Do the work (replace battery, sensor, check gateway)
  5. Take photo(s) of completed work (mandatory for battery/sensor replace)
  6. Add note if needed
  7. Mark "Completed"
     → If linked to alert: alert auto-resolves
     → If battery replace: device.battery_pct resets to 100% on next reading
     → Activity log records completion
```

### Alert dismissal tracking

When an alert is acknowledged or resolved:
- Record who, when, and how (WhatsApp ack, app ack, auto-resolved, work order completed)
- If dismissed without work order: flag for review (was it a false positive? did someone just silence it?)
- Monthly report includes: alerts generated vs acknowledged vs resolved vs dismissed without action

---

## 12. Floor Plans & Sensor Placement

### Upload flow (Settings → Sites → Floor Plans)
1. org_admin or super_admin uploads a 2D floor plan image (PNG/JPG) per floor
2. Names each floor (e.g. "Planta Baja", "Piso 1", "Bodega")
3. Sets floor number for ordering

### Sensor placement (drag-and-drop)
1. After uploading floor plan, go to "Place Sensors" view
2. See list of unplaced devices for this site
3. Drag sensor from list → drop onto floor plan
4. Saves normalized coordinates (0-1 range for x,y) so placement works at any zoom/resolution
5. Each sensor shows as a colored dot:
   - Green = normal
   - Yellow = warning
   - Red = alert
   - Gray = offline

### Live view
- On Site Detail page, floor plan shows all sensors with real-time status
- Click a sensor dot → popup with current reading + link to sensor detail
- Available on both web and mobile app

---

## 13. MQTT Simulator (Development & Demo)

For development and sales demos without real hardware.

```
php artisan simulator:start --sites=3 --devices-per-site=10

Simulates:
  → Publishes fake uplinks to local MQTT broker (or ChirpStack Cloud test app)
  → Realistic Milesight payloads (correct format per sensor model)
  → Temperature: sinusoidal pattern with 2-4 defrost spikes/day
  → Door events: random opens with realistic duration
  → Energy: daily consumption curve (high during day, low at night)
  → Battery: slowly decreasing over weeks
  → Occasional anomalies: temp drift, door left open, sensor offline

Modes:
  --mode=normal       — All sensors behaving normally (demo: "look how green everything is")
  --mode=incidents    — Inject 2-3 incidents per hour (demo: alerts, escalation)
  --mode=onboarding   — Sensors come online one by one (demo: provisioning flow)
  --mode=stress       — 1000 sensors, rapid readings (load testing)
```

### Mock data per sensor model

| Model | Metrics | Normal range | Anomaly |
|---|---|---|---|
| EM300-TH | temperature, humidity | -18 to 4°C (depends on zone) | Spike to 15°C+ |
| CT101 | current (amps) | 2-15A (compressor running) | 0A (compressor dead) or 25A+ (overload) |
| WS301 | door_status (0/1), duration | Open 10-30s, 5-15x/day | Open > 5 min |
| GS101 | gas_detected (0/1), gas_value | 0 (no leak) | 1 (leak detected) |
| EM300-PT | temperature (probe) | 60-200°C (oven/hot food) | Drop below holding temp |
| EM310-UDL | distance_mm, leak_status | Normal level | Water detected |
| AM307 | temp, humidity, co2, tvoc, pressure, light, noise | CO2 400-800 ppm | CO2 > 1200 ppm |

---

## 14. WhatsApp Templates (Twilio)

All templates in Spanish. Only for **alerts** — no marketing, no spam.

### Required templates (need Meta approval):

**1. alert_critical**
```
🔴 ALERTA CRÍTICA — {{site_name}}
{{alert_message}}
Sensor: {{device_name}} ({{zone}})
Hora: {{time_local}}

Responde:
1️⃣ Reconocer
2️⃣ Escalar
```

**2. alert_high**
```
🟡 ALERTA — {{site_name}}
{{alert_message}}
Sensor: {{device_name}} ({{zone}})
Hora: {{time_local}}

Responde 1 para reconocer.
```

**3. alert_escalation**
```
⚠️ ESCALAMIENTO — {{site_name}}
La alerta "{{alert_message}}" no fue atendida en {{minutes}} minutos.
Nivel de escalamiento: {{level}}

Responde 1 para reconocer.
```

**4. alert_resolved**
```
✅ RESUELTA — {{site_name}}
{{alert_message}}
Duración: {{duration}}
Resuelta: {{resolution_type}}
```

> **Rate limiting:** Queue WhatsApp messages with priority. Critical > High > Resolved.
> If mass event (e.g. city power outage affecting 50 sites), batch and throttle to avoid Twilio rate limits.
> Consider: one summary message "12 de tus tiendas reportan corte eléctrico" instead of 12 individual messages.

---

## 15. Recipes System

Recipes are pre-built alert + configuration templates per sensor model + use case. They are Astrea's core IP — the operational knowledge encoded into software.

### What a recipe contains

```json
{
  "id": "cold_chain_walkin_em300th",
  "name": "Walk-in Cooler — EM300-TH",
  "module": "cold_chain",
  "sensor_model": "EM300-TH",
  "description": "Monitoreo de cuarto frío walk-in. Rango -18°C a -12°C.",
  "default_zone_name": "Walk-in Cooler",
  "defrost_detection": true,
  "rules": [
    {
      "name": "Temp alta (warning)",
      "metric": "temperature",
      "condition": "above",
      "threshold": -12,
      "duration_min": 10,
      "severity": "medium",
      "cooldown_min": 30
    },
    {
      "name": "Temp crítica",
      "metric": "temperature",
      "condition": "above",
      "threshold": -8,
      "duration_min": 5,
      "severity": "critical",
      "cooldown_min": 15
    },
    {
      "name": "Temp demasiado baja",
      "metric": "temperature",
      "condition": "below",
      "threshold": -25,
      "duration_min": 15,
      "severity": "high",
      "cooldown_min": 60
    },
    {
      "name": "Humedad alta",
      "metric": "humidity",
      "condition": "above",
      "threshold": 85,
      "duration_min": 30,
      "severity": "low",
      "cooldown_min": 120
    }
  ]
}
```

### Seeded recipes (Phase 0)

| Recipe | Sensor | Module | Key thresholds |
|---|---|---|---|
| Walk-in Cooler | EM300-TH | cold_chain | -18 to -12°C, defrost on |
| Walk-in Freezer | EM300-TH | cold_chain | -22 to -18°C, defrost on |
| Vitrina refrigerada | EM300-TH | cold_chain | 0 to 4°C, defrost on |
| Vitrina congelados | EM300-TH | cold_chain | -20 to -16°C, defrost on |
| Isla/Cooler horizontal | EM300-TH | cold_chain | -18 to -14°C, defrost on |
| Almacén/Bodega fría | EM300-TH | cold_chain | 0 to 8°C, defrost off |
| Circuito compresor | CT101 | energy | 2-15A normal, >20A overload, 0A dead |
| Puerta cuarto frío | WS301 | cold_chain | Open > 3 min = warning, > 10 min = critical |
| Puerta bodega | WS301 | cold_chain | Open > 5 min = warning, > 15 min = high |
| Fuga de gas | GS101 | safety | Any detection = critical + immediate escalation |
| Sonda horno/hot food | EM300-PT | compliance | Holding temp > 60°C, below = alert |
| Fuga de agua | EM310-UDL | safety | Water detected = high |
| IAQ oficina | AM307 | iaq | CO2 > 1000 = warning, > 1500 = high |
| IAQ básico | AM103L | iaq | CO2 > 1000 = warning |

### Editability

- **org_admin:** Can adjust thresholds (e.g. change -12°C to -10°C), enable/disable individual rules within a recipe. Cannot delete Astrea-seeded recipes.
- **super_admin:** Full control. Create new recipes, modify any field, delete.
- When org_admin customizes a recipe, it creates a `site_recipe_override` — the original recipe stays intact for other sites.

---

## 16. Key Laravel Components

### Models (Eloquent)

```
App\Models\
├── Organization
├── Site
├── FloorPlan
├── Gateway
├── Device
├── SensorReading (TimescaleDB hypertable)
├── Module
├── SiteModule
├── Recipe
├── SiteRecipeOverride
├── AlertRule
├── Alert
├── AlertAcknowledgment
├── AlertNotification
├── EscalationChain
├── DefrostSchedule
├── WorkOrder
├── WorkOrderPhoto
├── WorkOrderNote
├── ActivityLog (Spatie Activity Log)
├── User
├── UserSite (pivot)
├── PushToken
├── BillingProfile
├── Subscription
├── SubscriptionItem
├── Invoice
└── Report
```

### Services

```
App\Services\
├── ChirpStack\MqttListener       — MQTT connection to ChirpStack Cloud + dispatch
├── ChirpStack\DeviceProvisioner   — Register devices in ChirpStack Cloud via REST API
├── Decoders\MilesightDecoder      — Normalize + validate decoded payloads by model
├── Decoders\DecoderFactory        — Route to correct normalizer by device model
├── RulesEngine\RuleEvaluator      — Evaluate alert conditions
├── RulesEngine\DefrostDetector    — 48h auto-learn + suppress during defrost windows
├── RulesEngine\BaselineService    — Learn normal patterns per device
├── Alerts\AlertRouter             — Determine channel + contact + send (WhatsApp/Push/Reverb)
├── Alerts\EscalationService       — Handle escalation chains
├── Alerts\PushNotificationService — Send push via Expo Push API / FCM
├── WhatsApp\TwilioService         — Send WhatsApp messages via Twilio
├── WorkOrders\WorkOrderService    — Create from alerts, assign to techs, track lifecycle
├── Provisioning\SiteOnboarder     — Wizard: create site → register devices → assign recipes
├── Reports\TemperatureReport      — Generate COFEPRIS/NOM-251 PDF
├── Reports\EnergyReport           — Generate energy analysis PDF
├── Reports\MorningSummaryService  — "What happened last night" per site/regional/corporate
├── Billing\SubscriptionService    — Manage subscriptions + metering
├── Simulator\MqttSimulator        — Fake sensor data for dev/demo (publishes to local MQTT)
└── Readings\ReadingQueryService   — Efficient TimescaleDB queries
```

### Jobs

```
App\Jobs\
├── ProcessSensorReading           — Decode + store + trigger rules
├── EvaluateAlertRules             — Check all rules for a reading (incl. defrost check)
├── SendAlertNotification          — Send via WhatsApp/Push/SMS based on severity + role
├── SendPushNotification           — Send via Expo Push API
├── EscalateAlert                  — Delayed job, escalate if no ack
├── LearnDefrostPattern            — Scheduled: analyze 48h data, detect defrost cycles
├── CreateWorkOrder                — Auto-create from battery/offline/maintenance alerts
├── GenerateReport                 — Create PDF report
├── CheckDeviceHealth              — Scheduled: detect offline sensors, low battery
├── SendMorningSummary             — Scheduled: per-timezone, at site opening_hour
├── SendRegionalSummary            — Scheduled: one digest for site_managers (all their sites)
├── SendCorporateSummary           — Scheduled: email to org_admin (all sites overview)
└── CompressOldReadings            — Scheduled: TimescaleDB maintenance
```

### Inertia Pages (React)

```
resources/js/Pages/
├── Auth/
│   ├── Login.tsx
│   └── ForgotPassword.tsx
├── CommandCenter/
│   ├── Index.tsx                  — Global overview
│   ├── Organizations/Show.tsx     — Org detail
│   ├── Devices.tsx                — Device health
│   ├── Revenue.tsx                — MRR dashboard
│   ├── Alerts.tsx                 — Alert queue
│   ├── WorkOrders.tsx             — Work order management
│   └── Dispatch.tsx               — Field tech dispatch + work order map
├── Dashboard/
│   └── Index.tsx                  — Client multi-site dashboard
├── Sites/
│   ├── Show.tsx                   — Site detail with floor plan
│   └── Zones/Show.tsx             — Zone detail
├── Devices/
│   └── Show.tsx                   — Single sensor detail
├── Alerts/
│   ├── Index.tsx                  — Alert list
│   └── Show.tsx                   — Alert detail + timeline
├── Reports/
│   ├── Index.tsx                  — Report builder
│   ├── Temperature.tsx            — COFEPRIS report
│   ├── Energy.tsx                 — Energy report
│   └── Summary.tsx                — Monthly summary
└── Settings/
    ├── Organization.tsx
    ├── Sites/
    │   ├── Index.tsx
    │   ├── Edit.tsx
    │   ├── Onboard.tsx              — New site onboarding wizard
    │   └── FloorPlans.tsx           — Upload plans + drag-drop sensors
    ├── Devices/
    │   ├── Index.tsx
    │   └── Edit.tsx
    ├── Rules/
    │   ├── Index.tsx
    │   └── Edit.tsx                 — Includes recipe threshold editor
    ├── Users.tsx                    — Users + escalation chains + site assignment
    ├── Modules.tsx
    ├── ActivityLog.tsx              — Audit trail viewer
    ├── BillingProfiles.tsx          — Manage RFC / billing entities
    └── Billing.tsx                  — Invoices, subscriptions, profile selector
```

---

## 17. Integrations

| System | Method | Priority | Notes |
|---|---|---|---|
| **ChirpStack Cloud** | MQTT (subscribe) | P0 | Managed LoRaWAN network server |
| **Twilio** | REST API | P0 | WhatsApp Business API + SMS fallback |
| **Redis** | Native | P0 | Queues, cache, sessions, Reverb backend |
| **Laravel Reverb** | WebSocket | P0 | Live dashboard updates (web) |
| **Expo Push / FCM** | REST API | P0 (Phase 2) | Push notifications for mobile app |
| **S3/Spaces** | Laravel Filesystem | P1 | PDF storage, exports |
| **Facturapi** | REST API | P1 | Timbrado de facturas CFDI 4.0 (XML + PDF sellado) |
| **Postmark** | SMTP / REST API | P0 | Transactional email (summaries, digests, invoices) |
| **Leaflet / Maps** | Frontend | P1 | Multi-site map view (web + mobile) |
| **Meta WhatsApp Cloud** | REST API | P2 | Alternative to Twilio (cheaper at scale) |
| **SAP / CONTPAQ** | Webhook / CSV | P3 | Client ERP integration |

---

## 18. Development Phases

### Phase 0: Foundation (Week 1-2)

- [ ] Laravel 12 project setup with Herd
- [ ] PostgreSQL + TimescaleDB extension installed
- [ ] Inertia.js + React + shadcn/ui configured
- [ ] Tailwind CSS 4 setup
- [ ] Spatie Permission + Spatie Activity Log packages installed
- [ ] Database migrations: organizations, sites, gateways, devices, users, roles, user_sites, floor_plans, activity_logs
- [ ] TimescaleDB hypertable for sensor_readings
- [ ] Basic auth (login, register, forgot password)
- [ ] App layout with sidebar (shadcn)
- [ ] Multi-tenancy scope: org_id + site-level scoping via user_sites
- [ ] User-site assignment UI (org_admin assigns users to sites)
- [ ] **REST API foundation** (Sanctum routes alongside Inertia — needed for Phase 8 mobile app)
- [ ] **Recipe seeder** — all 14 default recipes loaded (see Section 15)
- [ ] Forge server provisioned (PostgreSQL + Redis + TimescaleDB) — **DigitalOcean SFO3**
- [ ] CI/CD: push to main → deploy to Forge

### Phase 1: Data Pipeline + Provisioning (Week 3-4)

- [ ] ChirpStack Cloud MQTT listener (Laravel queue worker)
- [ ] ChirpStack Cloud REST API integration (DeviceProvisioner service)
- [ ] **Site onboarding wizard:**
  - [ ] Create site: name, address, timezone, opening_hour
  - [ ] Register gateway (serial → ChirpStack Cloud API)
  - [ ] Register devices (scan/type dev_eui → ChirpStack Cloud API → auto-assign recipe)
  - [ ] Upload floor plan(s) + drag-drop sensor placement
- [ ] Milesight payload decoders (EM300-TH, CT101, WS301, GS101, EM300-PT, EM310-UDL)
- [ ] ProcessSensorReading job (decode → store → broadcast)
- [ ] Device health checker (offline detection, low battery → auto-create work order)
- [ ] Sensor readings API (with TimescaleDB time_bucket queries)
- [ ] Basic device management page (list, status, battery, last seen)
- [ ] Live reading updates via Reverb (WebSocket)
- [ ] **MQTT Simulator** — `php artisan simulator:start` for development without real sensors
- [ ] **API endpoints for readings + devices** (parallel to Inertia pages)
- [ ] Activity log: track all provisioning actions

### Phase 2: Alert Engine (Week 5-7)

- [ ] Alert rules model + CRUD
- [ ] Rule evaluator service (simple: threshold + duration)
- [ ] Correlation rules (CT101 + EM300-TH = compressor degradation)
- [ ] Alert creation + severity levels (critical, high, medium, low)
- [ ] Escalation chain model + configuration page (references users, not separate contacts)
- [ ] User management: add non-app users (has_app_access=false) for WhatsApp-only recipients
- [ ] WhatsApp integration via Twilio (4 pre-approved templates — see Section 14)
- [ ] Alert acknowledgment flow (WhatsApp button → webhook → update alert)
- [ ] Escalation job (if no ack in X min → next level)
- [ ] Alert dismissal tracking (who, when, how — flag dismissals without work order)
- [ ] Alert list page + alert detail page
- [ ] Alert notifications log
- [ ] **Severity-based routing:** critical/high → WhatsApp + push; medium → push; low → dashboard only
- [ ] **Rate limiting:** batch WhatsApp during mass events ("12 tiendas reportan corte eléctrico")
- [ ] **API endpoints for alerts** (parallel to Inertia pages)
- [ ] Activity log: track rule changes, escalation chain edits, alert acks

### Phase 3: Dashboards + Morning Summary (Week 8-10)

- [ ] Client dashboard (multi-site overview with map)
- [ ] Site detail page (sensor grid, zone cards, status indicators)
- [ ] **Floor plan live view** — sensors as colored dots on uploaded 2D plan
- [ ] Zone detail page (temperature chart, sensor list, alert timeline)
- [ ] Sensor detail page (reading chart 24h/7d/30d, status, alert history)
- [ ] **Morning summary system:**
  - [ ] Store-level: push notification at site opening_hour (per-timezone)
  - [ ] Regional: push + email 30 min after earliest store opens
  - [ ] Corporate: email digest at 8am (configurable per org)
- [ ] KPI cards (alerts resolved, response time, savings estimate)
- [ ] Real-time updates via Reverb on all dashboard pages
- [ ] **Site-scoped views**: site_viewer sees only their store, site_manager sees their assigned sites

### Phase 4: Cold Chain Module (Week 11-13)

- [ ] Module activation system (site_modules)
- [ ] Temperature zones configuration
- [ ] Zone health status (green/yellow/red)
- [ ] Cold chain timeline visualization
- [ ] **Defrost cycle auto-detection (48h learning)**
  - [ ] DefrostDetector service: collect spikes, detect patterns after 48h
  - [ ] defrost_schedules table + model
  - [ ] LearnDefrostPattern job (runs for each new device at hour 49)
  - [ ] Alert suppression during detected defrost windows
  - [ ] Soft alerts during learning mode ("sistema en calibración")
  - [ ] Confirmation flow: notify site_viewer to confirm detected schedule
  - [ ] Failed defrost detection (temp doesn't recover → real alert)
- [ ] HACCP temperature report (PDF with Browsershot)
- [ ] COFEPRIS audit-ready PDF export
- [ ] **Recipe editor:** org_admin can adjust thresholds per site (creates override, keeps original)

### Phase 5: Energy + Compliance Modules (Week 14-15)

- [ ] Energy dashboard (consumption per circuit, daily/weekly/monthly)
- [ ] Baseline comparison (this period vs previous)
- [ ] Cost calculator (kWh × CFE tariff)
- [ ] Night waste detection
- [ ] Compliance module: continuous temperature log
- [ ] Excursion report with corrective actions
- [ ] Audit-ready PDF with client branding
- [ ] Activity log viewer (for audit trail — who changed what, when)

### Phase 6: Command Center + Work Orders (Week 16-18)

- [ ] Global overview page (all orgs, all sites, health)
- [ ] Organization drill-down
- [ ] Device health across all orgs
- [ ] Revenue dashboard (MRR by segment, by org)
- [ ] Alert queue (assign to support techs)
- [ ] Field dispatch (map with visit schedule)
- [ ] **Work order system:**
  - [ ] Auto-create from battery/offline/maintenance alerts
  - [ ] Manual creation from Command Center
  - [ ] Assign to technician
  - [ ] Work order lifecycle (open → assigned → in_progress → completed)
  - [ ] Photo upload (mandatory for hardware replacements)
  - [ ] Notes per work order
  - [ ] Completion → auto-resolve linked alert
  - [ ] Monthly report: alerts vs acknowledged vs resolved vs dismissed

### Phase 7: Billing + Polish (Week 19-20)

- [ ] Subscription model (base + per-sensor metering, volume discounts on Base only)
- [ ] **Gateway addon billing** — 2nd+ gateway at $2,500/mes per site
- [ ] Billing profiles CRUD (org_admin manages RFCs / razón social / régimen fiscal per entity)
- [ ] Invoice generation linked to billing profile (factura PDF with correct RFC data)
- [ ] CFDI timbrado integration (Facturapi) for XML + PDF sellado
- [ ] Payment tracking: mark invoices as paid (manual or bank reconciliation)
- [ ] Invoice history per org + download PDF/XML
- [ ] User invitation flow
- [ ] Settings pages polish
- [ ] Mobile-responsive design pass
- [ ] Performance optimization (eager loading, caching, chunked queries)

### Phase 8: Mobile App — Expo (Week 21-25)

The mobile app is the **daily monitoring interface** for store-level and regional users. The web platform remains the configuration and deep analysis tool.

- [ ] Expo project setup (React Native, TypeScript, Expo Router)
- [ ] Auth: Sanctum token login + biometric (FaceID/TouchID) for returning users
- [ ] Push notification setup (Expo Push + FCM)
- [ ] push_tokens table + registration flow
- [ ] **Screens by role:**

| Screen | site_viewer | site_manager | technician | org_admin |
|---|---|---|---|---|
| Login (biometric) | Yes | Yes | Yes | Yes |
| My Sites (list + status) | 1 site | Multiple | Multiple | All |
| Site Detail (zones + floor plan) | Yes | Yes | Yes | Yes |
| Active Alerts + Acknowledge | Yes | Yes | Yes | Read-only |
| Alert Detail + Timeline | Yes | Yes | Yes | Yes |
| Device Detail (battery, signal, readings) | Basic | Basic | Full | Basic |
| Multi-site KPIs + Compare | — | Yes | — | Yes |
| Morning Summary | Yes | Yes (all sites) | — | Summary |
| Work Orders (my assigned) | — | — | Yes | — |
| Work Order Detail + Photo upload | — | — | Yes | — |
| Reports (view PDF) | — | Yes | — | Yes |

- [ ] Offline caching: last known device status + recent readings (for technicians in walk-in coolers)
- [ ] Pull-to-refresh + real-time updates (WebSocket or polling)
- [ ] Deep linking from WhatsApp alerts → specific alert in app
- [ ] **Field tech provisioning flow** (scan dev_eui → register on-site)
- [ ] TestFlight (iOS) + Google Play internal testing track

### Phase 9: Advanced (Week 26+)

- [ ] Door pattern intelligence (normal frequency, alert on duration)
- [ ] Compressor duty cycle analysis
- [ ] Industrial module (vibration, compressed air)
- [ ] IAQ/HVAC module (AM307, occupancy vs HVAC)
- [ ] People & Flow module (VS121)
- [ ] Partner portal (white-label)
- [ ] API pública (REST, documented)

### Phase 10: Operational Completeness (Pre-Launch — Critical)

> These features close the gap between "monitoring tool" and "operational platform." The detection side is strong; these complete the resolve → prove compliance loop.

- [ ] **Corrective Action Workflow (WF-013)**
  - When a temperature excursion or critical alert occurs, COFEPRIS auditors ask: "What did you DO about it?"
  - New table: `corrective_actions` (id, alert_id, site_id, action_taken, taken_by, taken_at, verified_by, verified_at, notes)
  - Flow: Alert triggers → system prompts for corrective action → site_viewer/site_manager logs what they did → appears in compliance report
  - Inline section on Alert Detail page: "Corrective Action" form (textarea + submit)
  - Compliance report PDF includes: excursion timestamp, duration, corrective action taken, who, when
  - Required for: COFEPRIS audits, NOM-251 compliance, insurance claims
  - Without this: clients fail audits → blame Astrea → churn

- [ ] **Device Replacement Flow**
  - Sensors die. Batteries run out permanently. This is a weekly event at scale (>20 sites).
  - New endpoint: `POST /devices/{device}/replace` with `{new_dev_eui, new_app_key, new_model?}`
  - UI flow (web + mobile): Select device to replace → enter new dev_eui → system auto-transfers: zone, floor plan position (x/y), recipe assignment, alert rule bindings
  - Old device: status → `replaced`, `replaced_at`, `replaced_by_device_id` set
  - New device: inherits all config, starts with status `pending` → provisions in ChirpStack → `active` on first reading
  - History: old device's readings preserved under old dev_eui. New device starts clean.
  - Activity log: "Device X replaced by Device Y by Technician Z"

- [ ] **Client Data Export & Offboarding**
  - LFPDPPP (Mexican data protection law) requires data portability on request
  - New endpoint: `GET /settings/export-data` (org_admin) — generates a ZIP with:
    - All sensor readings (CSV, chunked by month)
    - All alerts with corrective actions (CSV)
    - All work orders with photos (ZIP subfolder)
    - All compliance events (CSV)
    - User list (CSV, excluding passwords)
    - Invoice history (PDF copies)
  - Async job: `ExportOrganizationData` — generates in background, emails download link when ready
  - Offboarding workflow: org_admin requests export → super_admin deactivates subscription → data archived (not deleted) for retention period → hard delete after 12 months

- [ ] **Alert Analytics & Tuning Dashboard**
  - Alert fatigue is the #1 reason IoT monitoring projects fail. Clients need visibility into alert patterns.
  - New page: `/analytics/alerts` (org_admin, site_manager)
  - Content:
    - Top 10 noisiest rules (most alerts/week) with "tune" link
    - Dismissal rate by rule (high dismissal = noisy rule → needs threshold adjustment)
    - Average response time by site (time from alert → acknowledge)
    - Alert trend over 30/90 days (increasing = problem, decreasing = stable)
    - Alert resolution breakdown: auto-resolved vs manual vs work order vs dismissed
    - "Suggested tuning" recommendations: "Rule X fires 50x/week — consider raising threshold by 2°C"
  - This page directly reduces alert fatigue and prevents churn

- [ ] **Scheduled / Automated Report Delivery**
  - Compliance requires regular reports without manual action
  - New table: `report_schedules` (id, site_id, org_id, type, frequency, day_of_week, time, recipients_json, active)
  - Types: temperature_compliance, energy_summary, alert_summary, executive_overview
  - Frequencies: daily, weekly, monthly
  - Job: `SendScheduledReports` — runs daily, checks schedules, generates + emails PDF
  - Settings UI: `/settings/report-schedules` — configure per-site or org-wide delivery
  - Default schedule on site activation: weekly temperature compliance report to org_admin every Monday 8am

- [ ] **Maintenance Window / Scheduled Downtime per Site**
  - Sites have scheduled maintenance: "Walk-in cooler cleaned every Tuesday 2-4pm" or "Defrost cycle test Wednesday 6am"
  - New table: `maintenance_windows` (id, site_id, zone, title, recurrence_rule, start_time, duration_minutes, suppress_alerts, created_by)
  - During window: suppress alerts for affected zone (similar to defrost suppression but user-defined)
  - Activity log: "Maintenance window active: Walk-in Cooler cleaning 2-4pm"
  - Without this: every scheduled maintenance generates false alerts → alert fatigue → people ignore real alerts
  - Different from user quiet hours (per-user) — this is per-SITE, per-ZONE scheduled downtime

- [ ] **Mass Offline Detection & Gateway Outage Grouping**
  - When a gateway dies or site loses power, all 15 sensors go offline within minutes
  - Current behavior: creates 15 individual "device offline" work orders — wrong
  - Correct behavior: if >50% of devices at a site go offline within 5 minutes → create ONE site-level alert "Possible power outage or gateway failure at [site]" → suppress individual device offline alerts/work orders
  - Check gateway status first: if gateway offline → "Gateway offline" alert (not device alerts)
  - Check cross-site pattern: if >3 sites go offline simultaneously → "Upstream outage" alert to super_admin only
  - Without this: first power outage at a 15-sensor site generates 15 WhatsApp messages → client overwhelmed → blocks the number

- [ ] **Upstream Outage Declaration (super_admin)**
  - When ChirpStack Cloud or Twilio has an outage, ALL devices across ALL sites go offline
  - super_admin needs a "Declare Outage" button in Command Center
  - While active: suppress all offline alerts platform-wide, show banner on all dashboards "Platform experiencing upstream issues — monitoring temporarily degraded"
  - When resolved: "End Outage" → resume normal monitoring, send summary of what was missed
  - Without this: ChirpStack 1-hour outage = hundreds of false work orders across all clients

- [ ] **LFPDPPP Consent Tracking**
  - Mexican data protection law requires proof of privacy policy acceptance
  - New fields on User: `privacy_accepted_at`, `privacy_policy_version`
  - On first login (or account creation): show privacy policy → require acceptance → store timestamp + version
  - On policy update: re-prompt acceptance on next login
  - Export includes consent records as part of data portability (Phase 10 data export)
  - Minimal effort but legally required for B2B platforms processing personal data

- [ ] **Sensor Data Sanity Checks**
  - Sensors occasionally send physically impossible values (e.g., 500°C from EM300-TH rated -40 to 85°C)
  - New config: per-model valid ranges (EM300-TH: -40 to 85°C, CT101: 0 to 100A, etc.)
  - Pipeline behavior: if reading outside valid range → discard reading, log anomaly, do NOT store in TimescaleDB, do NOT trigger alerts
  - Anomaly counter: if device sends 5+ invalid readings in 1 hour → create alert "Sensor X sending invalid data — possible hardware failure"
  - Without this: garbage data triggers false alerts, corrupts reports, destroys client trust

- [ ] **Mobile API for Phase 10 Features**
  - Phase 10 features are mobile-first workflows (done on-site by gerente/technician):
    - Corrective actions → mobile API endpoint + mobile screen
    - Temperature verification checklist → mobile-first flow
    - Device replacement → mobile scan + register flow
    - Alert snooze → mobile alert detail button
  - Update `routes/api.php` and `MOBILE_APP_PRD.md` to include Phase 10 endpoints
  - All Phase 10 features must work on both web AND mobile

- [ ] **Site Template Cloning**
  - At scale (50+ stores for a chain), configuring each site from scratch is a bottleneck
  - New table: `site_templates` (id, org_id, name, modules, zone_config, recipes, escalation_structure, created_by)
  - Flow: Configure a "golden" site → Save as Template → On new site onboarding, select template → pre-fills: modules, zone names, recipe assignments, escalation chain structure
  - Technician only needs to: register gateway serial + scan dev_euis + place on floor plan
  - Reduces onboarding from ~30 min to ~10 min per site
  - Critical for enterprise deals (OXXO, 7-Eleven, Walmart) where onboarding 50+ sites/month

- [ ] **Health Check Endpoint + Monitoring Integration**
  - `GET /health` returns JSON: DB connection, Redis connection, queue depth, last MQTT reading timestamp, worker status
  - Integration with uptime monitoring (Pingdom, Better Uptime, UptimeRobot)
  - If any check fails → external alert to Astrea team (separate from client alerts)
  - Without this: platform goes down and nobody knows until a client calls

- [ ] **Alert Delivery Monitoring Dashboard (super_admin)**
  - New section in Command Center: "Delivery Health"
  - Metrics: WhatsApp sent/delivered/failed (last 24h), Push sent/delivered/failed, Email bounce rate
  - Per-org breakdown: which clients have delivery issues?
  - Data source: `AlertNotification` model (already tracks sent/delivered/failed)
  - Without this: critical alerts silently failing to deliver, nobody knows

- [ ] **Duplicate Reading Protection (Idempotency)**
  - If `ProcessSensorReading` runs twice for the same payload (queue retry after timeout), same reading stored twice
  - Corrupts: charts (double data points), reports (inflated statistics), compliance data
  - Fix: unique constraint on `(device_id, time, metric)` in sensor_readings table + `INSERT ... ON CONFLICT DO NOTHING`
  - Or: idempotency key check in ProcessSensorReading job before storing
  - Without this: compliance reports show wrong data → audit failure

- [ ] **Platform-Wide Zero-Readings Auto-Detection**
  - Different from individual device offline (CheckDeviceHealth) and manual outage declaration
  - Scheduled check every 5 minutes: "Were ANY readings received platform-wide in the last 10 minutes?"
  - If zero → immediate alert to super_admin: "No sensor data received in 10 minutes — possible MQTT/ChirpStack outage"
  - Automatic — doesn't require human to notice and declare outage
  - Without this: 30+ minutes of silent platform outage during food safety monitoring

- [ ] **Dashboard Action Cards**
  - On Dashboard page, add "Needs Attention" section above site grid:
  - "X alerts need acknowledgment" (link to filtered alerts)
  - "X work orders overdue" (link to filtered WOs)
  - "X sensors battery critical" (link to device list)
  - Drives daily engagement — user lands on dashboard and immediately sees what needs action
  - Different from KPI cards (which show counts) — these are actionable prompts with direct links

### Phase 11: Operational Excellence (Post-Launch — Within 90 Days)

- [ ] **Site Comparison & Ranking Page**
  - New page: `/sites/compare` (site_manager, org_admin)
  - Rank sites by: compliance %, alert count, average response time, device uptime, energy cost
  - Side-by-side comparison of 2-5 selected sites
  - Regional manager's core question: "Which of my 15 sites is performing worst?"
  - Exportable as PDF for regional meetings

- [ ] **Daily Temperature Verification Checklist**
  - Gerente de tienda does a manual walk-through 3x/day checking physical thermometers
  - New table: `verification_logs` (id, site_id, user_id, zone, reading_value, sensor_agrees, notes, verified_at)
  - New page section on Site Detail: "Daily Verification" card
  - Mobile-first flow: Select zone → enter manual reading → system compares with sensor value → log discrepancy if >2°C → submit with digital signature
  - Appears in compliance reports: "Manual verification performed 3x/day by [Gerente Name]"
  - Required by: COFEPRIS, NOM-251, some insurance policies

- [ ] **Alert Snooze & Quiet Hours**
  - Per-user settings: quiet hours (e.g., 11pm-6am for site_viewer)
  - During quiet hours: LOW/MEDIUM alerts suppressed (queued, delivered at wake time). CRITICAL/HIGH still delivered immediately.
  - Per-alert snooze: "I know about this, remind me in 2 hours" button on Alert Detail
  - Prevents: people blocking the WhatsApp number → alerts stop working entirely

- [ ] **SLA & KPI Dashboard for org_admin**
  - New page: `/analytics/performance` (org_admin)
  - Metrics: average alert response time (target: <15 min), alerts resolved within SLA %, device uptime %, sensor coverage (% of zones monitored), compliance score per site
  - Trend over 30/90/365 days
  - Exportable as "ROI Report" PDF — org_admin shows to their board to justify the IoT investment
  - Without this: client can't prove value → cancels at contract renewal

- [ ] **User Deactivation & Responsibility Transfer**
  - When a user leaves the organization (technician quits, manager transfers):
  - Deactivate (not delete): block login, keep all audit trail records
  - Auto-reassign: open work orders reassigned to manager or unassigned
  - Escalation chains: remove user from all levels, notify org_admin of gaps
  - Activity log: "User X deactivated by Y, Z work orders reassigned"
  - LFPDPPP compliance: data retained for audit but user cannot access system

- [ ] **Notification Preferences per User**
  - Settings page section: "My Notifications"
  - Per-channel toggles: WhatsApp (on/off), Push (on/off), Email (on/off)
  - Per-severity filter: "Only notify me for Critical/High" vs "All severities"
  - Respects escalation chain (if user is in a chain, they still receive escalation-level notifications regardless of preference)
  - Without this: users who prefer push-only still get WhatsApp, or vice versa

- [ ] **Device/Asset Inventory Report**
  - New report type in Reports Index: "Device Inventory"
  - Content: all devices grouped by site/zone, model, battery level, last calibration, age, status
  - Sortable by: battery level (lowest first), age (oldest first), last seen
  - Exportable as CSV for procurement planning ("I need 20 EM300-TH replacements next quarter")
  - Useful for: annual budgeting, hardware lifecycle planning, fleet management

- [ ] **Bulk Operations on Key Screens**
  - Alerts Index: checkbox select → bulk acknowledge / bulk resolve
  - Work Orders Index: checkbox select → bulk assign to technician
  - Devices Index: checkbox select → bulk update zone / bulk update recipe
  - UI pattern: floating action bar at bottom when items selected (existing convention in WORKFLOW_UX_DESIGN.md)
  - Critical at scale: after a power restoration, 15 alerts resolve — user shouldn't click "ack" 15 times

- [ ] **Site Event Timeline (Investigation View)**
  - New page: `/sites/{id}/timeline` (org_admin, site_manager)
  - Unified chronological view of ALL events for a site on a given date range:
    - Sensor readings (key metrics)
    - Alerts (triggered, acknowledged, resolved)
    - Work orders (created, completed)
    - Activity log entries (config changes)
    - Corrective actions
  - Use case: client calls "something went wrong at Store X last Tuesday" → open timeline → see everything in one view
  - Filterable by: date range, event type, zone, device

- [ ] **site_viewer "Request Maintenance" Button + Request Status Tracking**
  - On Site Detail page: "Request Help" button visible to site_viewer role
  - Opens simple form: description (textarea) + priority (select) + optional photo
  - Creates a work order with type=maintenance, assigned to org_admin (who then assigns to tech)
  - Bridges the gap: gerente sees a problem but currently can't take action beyond acknowledging
  - Different from full WO creation (which requires manage work orders permission) — this is a simplified "help request"
  - **Status tracking:** site_viewer can see "My Requests" section on Site Detail — shows their submitted requests with current status (open/assigned/in_progress/completed). Without this, they submit a request into a void and never know if anyone responded.

- [ ] **Post-Onboarding Configuration Checklist**
  - After site onboarding completes, show org_admin a "Setup Checklist" banner on the site page:
    - ✅ Gateway registered
    - ✅ Devices provisioned
    - ✅ Modules activated
    - ⬜ Escalation chain configured (link to settings)
    - ⬜ Users assigned to site (link to settings)
    - ⬜ Report schedule configured (link to settings)
    - ⬜ Alert rules reviewed (link to settings)
  - Progress indicator: "Site is 60% configured — 3 items remaining"
  - Dismissable after all items completed (or manually by org_admin)
  - Prevents: org_admin skips escalation chain setup → alerts fire but nobody receives them → "system doesn't work" → churn within first week
  - Also useful for new org_admins taking over from previous person — shows what's configured and what's missing

- [ ] **Invoice Cancellation + CFDI Cancel**
  - When an invoice is generated incorrectly (wrong period, wrong amount, wrong billing profile):
  - New action on invoice row: "Cancel" button (org_admin or super_admin)
  - Flow: Cancel invoice → Facturapi API: cancel CFDI → invoice status: paid/sent → cancelled
  - SAT requires: cancellation reason code (01=with related doc, 02=without, 03=not executed, 04=related to global)
  - New invoice status: `cancelled` added to SM-003 lifecycle
  - Cancelled invoices remain visible (greyed out) for audit trail but excluded from revenue calculations
  - Via Facturapi: `DELETE /api/v3/invoices/{id}` with cancellation motivo

- [ ] **Technician Floor Plan Access**
  - Technician role can view floor plans on Site Detail page (read-only)
  - Shows device locations as colored dots — essential for physically locating sensors
  - Use case: tech arrives at store, needs to find "Sensor #7 in the walk-in cooler" — floor plan shows exactly where it is
  - Mobile-first: floor plan should be viewable in the mobile app with pinch-to-zoom
  - Currently: floor plan is visible to all roles on Site Detail, but technician PRD description doesn't explicitly include it. This confirms it should be accessible.

- [ ] **Technician Workload View for Managers**
  - On Work Orders Index page: "Team Workload" card or view for site_manager / org_admin
  - Shows: each technician with their open work order count, grouped by priority
  - Example: "Juan: 5 open (1 urgent, 2 high, 2 medium) | Maria: 2 open (2 medium)"
  - Helps managers assign new work orders to the least-loaded technician
  - Also useful on CC Dispatch page for super_admin
  - Without this: managers assign blindly → some techs overloaded, others idle

- [ ] **Subscription Plan Changes (Upgrade/Downgrade)**
  - Flow: org_admin requests plan change → super_admin approves → subscription updated
  - Upgrade (starter→enterprise): immediate effect, prorated billing for current period
  - Downgrade (enterprise→standard): effective at next billing period
  - Changes reflected in: billing dashboard, invoice generation, feature access
  - Activity log: "Subscription changed from starter to enterprise by [super_admin]"

- [ ] **Organization Suspend vs Archive**
  - Two distinct org states beyond active:
  - **Suspended** (non-payment): monitoring continues but with warning banner, no new sites, no config changes. Reversed when payment received.
  - **Archived** (departed client): monitoring stops, data retained for offboarding period (12 months), then eligible for deletion
  - Currently: only active/onboarding states. No explicit suspension for non-payment.

- [ ] **Configuration Summary / System Overview**
  - New section on Organization Settings or Dashboard: "Your Setup at a Glance"
  - Shows: sites count + status, total devices + health, active modules, alert rules count, escalation chains count, users by role, subscription plan
  - Useful for: new org_admins taking over, Astrea support calls ("let me pull up your config"), annual reviews
  - Not a separate page — a card/section on an existing page

- [ ] **Payment Reminders & Dunning**
  - Automated email when invoice becomes overdue (at 7, 14, 30 days)
  - Dunning escalation: org_admin → super_admin notified at 30 days overdue
  - Option to pause monitoring (with warning banner) for invoices >60 days overdue
  - No auto-deletion of data — just reduce service level until payment received

- [ ] **Platform Status Page**
  - At scale (50+ clients relying on this for food safety), outage communication is essential
  - Options: StatusPage.io, Instatus, or self-hosted
  - Content: real-time status of: web app, mobile API, MQTT pipeline, WhatsApp delivery, push notifications
  - Incident communication: "MQTT pipeline delayed 5 min due to ChirpStack maintenance — alerts may be delayed"
  - Subscribe: org_admin can subscribe to status updates via email
  - Link in app footer and login page

- [ ] **Complemento de Pago (CFDI Payment Complement)**
  - Mexican tax law (SAT) requires a separate CFDI when payment is received for a previously timbrado invoice
  - Flow: Invoice sent (CFDI timbrado) → Client pays via SPEI → org_admin marks paid → system generates Complemento de Pago CFDI → delivers to client
  - Via Facturapi API: `POST /api/v3/invoices/{id}/payment` complement
  - Without this: clients' accountants complain → friction → churn

### Phase 12: Competitive Advantage (Quarter 2+)

- [ ] **Sensor Data Gap Detection (NOM-072 Compliance)**
  - NOM-072 (pharmacies) requires continuous monitoring with no gaps >15 minutes
  - Detect and report gaps: "Device X had no readings between 2:30am-4:15am"
  - Different from "device offline" (health monitoring) — this is "was there a monitoring gap that affects compliance?"
  - New section in compliance reports: "Monitoring Gaps" table with device, gap start, gap end, duration
  - Alert: if gap >15 min on a device in a NOM-072 site → flag as compliance gap
  - Required for: pharmacy temp monitoring, sensitive medication storage

- [ ] **Probe Calibration Management**
  - New table: `calibration_records` (id, device_id, calibrated_at, next_calibration_at, certificate_path, calibrated_by, method)
  - Track when each sensor was last calibrated (annual requirement for food safety)
  - Alert when calibration expires (30/7/1 day reminders, same as compliance events)
  - Upload calibration certificate PDF
  - Show calibration status on device detail page
  - Competitors (Testo, ComplianceMate) have this — it's a sales differentiator

- [ ] **Audit Mode — One-Click Compliance View**
  - "Inspector is here" button on Site Detail → opens full-screen compliance view:
  - Last 90 days of temperature data per zone (continuous log)
  - All excursions with corrective actions taken
  - All verification logs (manual checks)
  - Calibration certificates for all sensors
  - Exportable as single PDF package
  - Time from "inspector arrives" to "documentation ready" should be <2 minutes

- [ ] **Cross-Site Comparison Report**
  - PDF report comparing N sites over a date range
  - Metrics: compliance %, alert count, response time, energy cost, device uptime
  - Useful for: regional meetings, board presentations, multi-franchise operations

- [ ] **Predictive Analytics**
  - Battery life prediction: based on drain rate, predict replacement date per device
  - Compressor failure prediction: CT101 current trend analysis → early warning 2-4 weeks before failure
  - Temperature drift detection: slow upward drift over weeks = seal degradation or refrigerant leak
  - Door pattern anomalies: "Store opened walk-in 3x more than usual" = possible process issue or theft

- [ ] **Batch Site Onboarding (CSV/Excel Import)**
  - Upload CSV with: site_name, address, lat, lng, timezone, opening_hour, template_name
  - System creates all sites, applies templates, generates gateway/device registration sheets
  - For enterprise deals onboarding 50+ sites simultaneously

- [ ] **Insurance Documentation Export**
  - When product loss occurs due to temperature failure:
  - Export package: sensor data proving temp excursion, timestamp, duration, corrective actions attempted, photos from work orders
  - Formatted for insurance claim submission
  - Competitive feature: Sensitech offers this

### Phase 13: Platform & Scale (Quarter 3+)

- [ ] **Public REST API with Developer Documentation**
  - Versioned API (v1) with OpenAPI/Swagger docs
  - Endpoints: readings, alerts, devices, sites (read-only for most clients)
  - API key authentication (existing `api_keys` table)
  - Rate limiting per key
  - Webhook subscriptions: client registers URL → receives real-time alert/reading events
  - Use case: client integrates Astrea data into their own BI tools (Looker, PowerBI, Tableau)

- [ ] **Custom Webhook Subscriptions**
  - New table: `webhook_subscriptions` already exists — extend with event type filtering
  - Events: alert.created, alert.resolved, reading.received, device.offline, work_order.completed
  - Payload: JSON with relevant data
  - Client-managed via Settings > Integrations or API

- [ ] **Multi-Currency Support**
  - Currently hardcoded to MXN
  - Add: `currency` field to Organization
  - Support: MXN, USD, COP, BRL (Latin America expansion)
  - Invoice generation respects org currency
  - Energy cost calculator uses local tariff

- [ ] **Reseller / Partner Portal**
  - Allow third-party companies to resell Astrea under their brand
  - Partner-level access: manage their own clients (subset of super_admin)
  - Revenue share tracking: partner earns X% of their clients' MRR
  - White-label depth: custom domain, custom email sender, "powered by" toggle

- [ ] **Digital Signatures on Compliance Documents**
  - e.firma (SAT) or advanced electronic signature on:
  - Temperature compliance reports
  - Corrective action records
  - Verification logs
  - Legal weight for COFEPRIS audits
  - Differentiator vs competitors who only offer unsigned PDFs

- [ ] **Anonymized Benchmark Data**
  - Opt-in: "Compare my metrics against similar operations"
  - Cross-client anonymized data: "Your walk-in cooler uses 15% more energy than similar coolers in your segment"
  - Valuable for: energy efficiency consulting, operational improvement recommendations
  - Competitive moat: only possible with sufficient client base (50+ orgs)

- [ ] **Custom Dashboard Builder**
  - org_admin creates their own KPI views
  - Drag-drop widgets: stat cards, charts, tables, maps
  - Save as named dashboards, share with roles
  - Use case: each client's operations director cares about different metrics

---

## 19. Non-Functional Requirements

| Requirement | Spec |
|---|---|
| **Alert latency** | Sensor → WhatsApp < 60 seconds |
| **Uptime** | 99.9% (< 8.7 hrs downtime/year) |
| **Data retention** | Raw: 12 months. Aggregated: 5 years |
| **Concurrent users** | 500 simultaneous (web) |
| **Device capacity** | 10,000 sensors in v1.0 |
| **Multi-tenancy** | Complete data isolation between orgs |
| **Hosting** | DigitalOcean via Forge (region: SFO3 — closest to Mexico) |
| **Backup** | Daily automated, 30-day retention |
| **LFPDPPP** | Mexican data protection law compliance |
| **RPO** | Recovery Point Objective: < 1 hour (max data loss on disaster) |
| **RTO** | Recovery Time Objective: < 4 hours (max downtime to restore service) |
| **Language** | Spanish (Mexico) primary, English secondary |
| **Browser support** | Chrome, Safari, Edge (latest 2 versions) |
| **PHP version** | 8.4+ |
| **Node version** | 20+ |

---

## 20. Forge Server Architecture

> **Note:** ChirpStack Cloud is managed externally — no self-hosted network server needed.

### Production

| Server | Specs | Role |
|---|---|---|
| **app-1** | 4 vCPU, 8GB RAM | Laravel app + Inertia + REST API + queue workers |
| **db-1** | 4 vCPU, 8GB RAM | PostgreSQL 16 + TimescaleDB |
| **cache-1** | 2 vCPU, 4GB RAM | Redis (queues, cache, Reverb) |

### Staging

| Server | Specs | Role |
|---|---|---|
| **staging-1** | 2 vCPU, 4GB RAM | Everything (app + DB + Redis) |

### Forge Configuration

- SSL via Let's Encrypt (auto-renewal)
- Queue workers: 5 processes (readings, alerts, push, reports, default)
- Scheduler: `php artisan schedule:run` every minute
- Reverb: running as daemon
- MQTT listener: running as daemon (supervisord) — connects to ChirpStack Cloud MQTT endpoint
- Deploy script: `git pull → composer install → npm run build → migrate → restart workers`

---

## 21. Herd Development Setup

```bash
# Prerequisites
# 1. Install Laravel Herd (herd.laravel.com)
# 2. Enable PostgreSQL + Redis in Herd
# 3. Install TimescaleDB extension

# Project setup
laravel new astrea-platform
cd astrea-platform

# Install dependencies
composer require inertiajs/inertia-laravel
composer require tightenco/ziggy
composer require spatie/laravel-permission
composer require spatie/laravel-activitylog
composer require php-mqtt/laravel-client
composer require spatie/browsershot
composer require laravel/reverb
composer require facturapi/facturapi-php

npm install react react-dom @inertiajs/react
npm install -D @types/react @types/react-dom
npm install tailwindcss @tailwindcss/vite
npm install @tremor/react recharts
npm install leaflet react-leaflet
npm install -D @types/leaflet
# shadcn/ui setup via npx shadcn@latest init

# Local MQTT broker for dev (simulates ChirpStack Cloud MQTT)
brew install mosquitto
# Configure .env: MQTT_HOST=127.0.0.1, MQTT_PORT=1883
# Configure .env: MAIL_MAILER=smtp, POSTMARK_TOKEN=... (or log for local dev)

# Database
php artisan migrate
php artisan db:seed --class=ModuleSeeder    # Create the 7 modules
php artisan db:seed --class=RecipeSeeder    # Create default recipes
php artisan db:seed --class=RoleSeeder      # Create roles + permissions

# Run
php artisan serve           # or use Herd link
php artisan queue:work      # Queue worker
php artisan reverb:start    # WebSocket server
php artisan mqtt:listen     # MQTT listener (custom command)
```

---

## 22. Success Metrics

| Metric | MVP target | v1.0 target |
|---|---|---|
| Alert latency (sensor → WhatsApp) | < 2 min | < 1 min |
| False positive rate | < 20% | < 5% |
| COFEPRIS report generation | < 60 sec | < 30 sec |
| New site onboarding | < 2 hrs (manual) | < 30 min |
| Sensor uptime | > 95% | > 99% |
| WhatsApp delivery rate | > 95% | > 99% |
| Push notification delivery rate | — | > 98% |
| Dashboard page load (web) | < 3 sec | < 1 sec |
| App load time (mobile) | — | < 2 sec |
| App crash rate | — | < 1% |
| Morning summary accuracy | — | 100% (right time, right timezone) |
| Work order completion rate | — | > 90% within 48h |

---

## 23. Decisions Log

| # | Question | Decision | Date |
|---|---|---|---|
| 1 | ChirpStack: self-hosted or cloud? | **ChirpStack Cloud** — managed, no ops overhead, faster to market | 2025-03-14 |
| 2 | WhatsApp: Twilio or Meta Cloud API? | **Twilio for MVP**, migrate to Meta Cloud at scale (cheaper) | 2025-03-14 |
| 3 | Multi-tenancy: stancl/tenancy or manual? | **Manual scoping** (org_id + site_id on every query) — simpler, no magic | 2025-03-14 |
| 4 | Notification channels? | **WhatsApp = emergencies** (critical/high). **Push = all alerts** (app for daily monitoring). **Web = config + deep analysis** | 2025-03-14 |
| 5 | Defrost cycle detection? | **Auto-learn in 48h** (heuristic, no ML). Soft alerts during learning. Confirm with user. | 2025-03-14 |
| 6 | Mobile app timing? | **Phase 2 (Week 20-24)**. API built from Phase 0 alongside Inertia to be ready. | 2025-03-14 |
| 7 | Role scoping? | **Site-level** via user_sites pivot. org_admin assigns regionals/techs to sites. | 2025-03-14 |

| 8 | Payment processing? | **No payment processor.** B2B clients pay via SPEI. Generate factura CFDI (Facturapi), track payment manually. | 2025-03-14 |
| 9 | Hosting region? | **DigitalOcean SFO3** — closest US region to Mexico. No legal requirement for Mexico hosting. | 2025-03-14 |
| 10 | WhatsApp templates? | **Spanish only. Alerts only (no spam).** 4 templates: critical, high, escalation, resolved. | 2025-03-14 |
| 11 | Morning summary timing? | **At site opening_hour** (org default, overridable per site). Regional 30min after. Corporate 8am email. | 2025-03-14 |
| 12 | Recipes: seeded or manual? | **Seeded by Astrea** (14 default recipes). org_admin can adjust thresholds. super_admin can create new. | 2025-03-14 |
| 13 | Floor plans? | **Upload 2D image per floor + drag-drop sensor placement.** Multi-floor support. | 2025-03-14 |
| 14 | Audit trail? | **Spatie Activity Log** — track rule changes, ack, escalation edits, device config, user roles. | 2025-03-14 |
| 15 | Dev without sensors? | **MQTT simulator** (`php artisan simulator:start`) with realistic Milesight payloads. | 2025-03-14 |
| 16 | Timezones? | **UTC storage, convert per site.** All user-facing content in site local time. | 2025-03-14 |
| 17 | Work orders? | **Auto-generated from alerts** (battery, offline, maintenance). Techs complete via app with photo. | 2025-03-14 |
| 18 | 2nd gateway? | **Addon at $2,500/mes.** Base includes 1 gateway. Industrial/large sites may need 2+. | 2025-03-14 |

| 19 | TimescaleDB install? | **DIY on Forge-provisioned server.** Forge provisions the DO droplet with PostgreSQL, we SSH in and install TimescaleDB extension manually (one-time setup). | 2025-03-14 |
| 20 | CFDI provider? | **Facturapi** — simpler API, better docs, startup-friendly. | 2025-03-14 |
| 21 | Sensor replacement? | **New device, linked via `replaced_device_id`.** History stays with old dev_eui. New sensor starts fresh but you can trace the lineage. | 2025-03-14 |
| 22 | Charts library? | **Tremor** (web, built on Recharts). **Victory Native** (Expo mobile). | 2025-03-14 |
| 23 | PDF library? | **Browsershot** (Puppeteer) — pixel-perfect branded PDFs for COFEPRIS. | 2025-03-14 |
| 24 | Maps library? | **Leaflet** — open source, free, no API billing. | 2025-03-14 |
| 25 | Email provider? | **Postmark** — transactional email for summaries, digests, invoices. | 2025-03-14 |
| 26 | ChirpStack decoding? | **ChirpStack Cloud decodes** (Milesight codec). Laravel normalizes/validates, doesn't decode raw bytes. | 2025-03-14 |
| 27 | Alert auto-resolve? | **2 consecutive normal readings** → auto-resolve. Prevents flapping on borderline values. | 2025-03-14 |
| 28 | Alert duration tracking? | **Redis state** (`alert_rule_state:{rule}:{device}`). Track first breach time, fire when duration met, reset on normal reading. | 2025-03-14 |
| 29 | Contacts vs Users? | **Merged.** Users table handles everyone. `has_app_access=false` for WhatsApp-only recipients (night guard, external techs). No separate contacts table. | 2025-03-14 |
| 30 | Multi-segment clients? | **Both.** Org has primary `segment` (for Command Center filtering). Sites have `segment_override` for different verticals (e.g., CEDIS in retail org). | 2025-03-14 |
| 31 | DO Spaces backup? | **Versioning on bucket** (enable later). For now, standard backups are enough. | 2025-03-14 |
| 32 | Billing profiles? | **Multiple per org.** `billing_profiles` table with RFC, razón social, régimen fiscal. Client chooses which entity to invoice per subscription. | 2025-03-14 |

| 33 | Corrective actions? | **Mandatory for compliance.** Inline on Alert Detail + included in compliance PDF. COFEPRIS requires documented response to every excursion. | 2026-03-19 |
| 34 | Device replacement flow? | **Transfer config, archive old device.** New device inherits zone, floor position, recipe, alert rules. History stays with old dev_eui. | 2026-03-19 |
| 35 | Client data export? | **ZIP with CSVs + PDFs.** Async job, email download link. Required by LFPDPPP (Mexican data privacy). | 2026-03-19 |
| 36 | Alert fatigue? | **Alert analytics dashboard.** Show noisiest rules, dismissal rates, suggest tuning. #1 anti-churn feature. | 2026-03-19 |
| 37 | Report automation? | **Scheduled delivery.** Weekly compliance PDF auto-emailed. Default schedule created on site activation. | 2026-03-19 |
| 38 | Site templates? | **Clone golden site config.** Modules, zones, recipes, escalation structure. Reduces onboarding from 30 min to 10 min. Critical for enterprise (50+ sites). | 2026-03-19 |
| 39 | Complemento de pago? | **Via Facturapi.** SAT requires separate CFDI when payment received. Without it, client's accountant complains. | 2026-03-19 |
| 40 | Quiet hours? | **Per-user setting.** LOW/MEDIUM suppressed during quiet hours, CRITICAL/HIGH always delivered. Prevents people blocking WhatsApp. | 2026-03-19 |
| 41 | Audit mode? | **One-click full compliance view.** 90 days of data + excursions + corrective actions + calibration certs in single PDF. Target: <2 min from inspector arrival to docs ready. | 2026-03-19 |
| 42 | Public API? | **Phase 13.** Versioned REST API with OpenAPI docs, webhook subscriptions, API key auth. Enables client BI integration. | 2026-03-19 |

| 43 | Mass offline detection? | **Group by gateway/site.** If >50% devices offline within 5 min → one site alert, not N device alerts. First power outage without this = 15 WhatsApp messages to gerente. | 2026-03-19 |
| 44 | Upstream outage? | **super_admin declares outage.** Suppress all offline alerts platform-wide. Resume + summary when resolved. Prevents hundreds of false WOs. | 2026-03-19 |
| 45 | Maintenance windows? | **Per-site, per-zone scheduled downtime.** Suppress alerts during known maintenance. Different from user quiet hours. | 2026-03-19 |
| 46 | Data sanity checks? | **Per-model valid ranges.** Discard physically impossible readings, log anomaly, alert after 5+ invalid readings. | 2026-03-19 |
| 47 | Gap detection? | **Flag monitoring gaps >15 min.** Required for NOM-072 (pharma). Include in compliance reports. | 2026-03-19 |
| 48 | Health check endpoint? | **GET /health with DB/Redis/MQTT/queue checks.** Integrate with uptime monitoring. Platform down = Astrea team alerted immediately. | 2026-03-19 |
| 49 | Duplicate readings? | **Idempotency via unique constraint or job-level check.** Prevents double data points that corrupt compliance reports. | 2026-03-19 |
| 50 | site_viewer permissions? | **Can acknowledge alerts + request maintenance.** Cannot resolve, dismiss, or create full work orders. Matches gerente de tienda daily workflow. | 2026-03-19 |
| 51 | Bulk operations? | **Phase 11.** Checkbox select + floating action bar. Critical at scale (15 alerts after power restoration). | 2026-03-19 |
| 52 | Notification preferences? | **Per-user channel toggles.** Respects escalation chain as override. Prevents users blocking WhatsApp by giving them control. | 2026-03-19 |
| 53 | Investigation timeline? | **Unified site event view.** All readings + alerts + WOs + activity on one timeline. For "what happened last Tuesday?" calls. | 2026-03-19 |
| 54 | RPO/RTO? | **RPO <1h, RTO <4h.** Food safety monitoring demands quick recovery. Daily backups + tested restore procedure. | 2026-03-19 |

### Still Open

| # | Question | Options | Context |
|---|---|---|---|
| 55 | Consent tracking? | **Privacy policy acceptance timestamp per user.** Re-prompt on policy updates. Required by LFPDPPP for B2B platforms. | 2026-03-19 |
| 56 | Post-onboarding checklist? | **Configuration progress banner on site page.** Shows remaining setup steps (escalation, users, reports, rules). Dismissable. Prevents "system doesn't work" churn. | 2026-03-19 |
| 57 | Invoice cancellation? | **Via Facturapi cancel API.** SAT requires cancellation reason code. Status: cancelled (greyed out, excluded from revenue). | 2026-03-19 |
| 58 | Tech floor plan access? | **Read-only on Site Detail.** Essential for physically locating sensors. Mobile-first with pinch-to-zoom. | 2026-03-19 |
| 59 | Tech workload visibility? | **Team Workload card on WO Index.** Shows open WO count per technician by priority. Prevents blind assignment. | 2026-03-19 |
| 60 | Org suspend vs archive? | **Two states: Suspended (non-payment, monitoring continues with banner) vs Archived (departed, data retained 12 months).** | 2026-03-19 |
| 61 | Maintenance request status? | **site_viewer sees "My Requests" on Site Detail.** Shows their submitted WOs with status. Without this, requests go into a void. | 2026-03-19 |

| 62 | NOM-072 (pharma) features? | Stricter temp requirements, dual-sensor validation, gap detection (<15 min) | Pharmacies have different rules than food. Need customer validation. |
| 63 | Predictive analytics scope? | Battery prediction (easy) vs compressor failure (hard) vs full ML pipeline | Start with heuristic-based (like defrost detection), ML later. |
| 64 | Partner/reseller model? | Revenue share % vs flat fee per client? | Depends on go-to-market strategy. Decide when first partner opportunity arises. |

---

*Astrea Technologies — PRD Platform v3.0 — Laravel 12 + Inertia + React + shadcn + Expo — Confidencial*
