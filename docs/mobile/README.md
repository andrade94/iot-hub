# Astrea IoT Mobile App Documentation

The Astrea mobile app (`iot-expo`) is a React Native / Expo companion to the iot-hub web platform. It provides field technicians, site managers, and organization admins with real-time visibility into IoT deployments -- alerts, work orders, device health, and site KPIs -- from their phone.

## Who it's for

| Role | Primary use |
|------|-------------|
| **Technician** | View assigned work orders, acknowledge alerts, add notes on-site |
| **Site Manager** | Monitor sites, triage alerts, create work orders, review device status |
| **Org Admin / Super Admin** | Dashboard-level KPIs across all sites, full alert and WO management |
| **Site Viewer** | Read-only site and device monitoring |

## Quick start

```bash
cd iot-expo
npm install
cp .env.example .env          # then set EXPO_PUBLIC_API_URL=http://iot-hub.test/api
npx expo start                # Expo Go or dev client
```

See [SETUP.md](SETUP.md) for full environment configuration, EAS builds, and test credentials.

## Documentation index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Directory structure, navigation, state management, theme system, API client, offline strategy, push notifications, i18n |
| [SCREENS.md](SCREENS.md) | Every screen in the app -- file path, purpose, params, API calls, components, role restrictions |
| [API_INTEGRATION.md](API_INTEGRATION.md) | Authentication flow, all `astrea.ts` API functions, error handling, offline queue, push token lifecycle |
| [SETUP.md](SETUP.md) | Prerequisites, installation, environment variables, simulator/device running, EAS builds, test credentials |

## Related iot-hub docs

- [ENTITY_REFERENCE.md](../project/ENTITY_REFERENCE.md) -- Backend models the mobile app consumes
- [PLATFORM_REFERENCE.md](../project/PLATFORM_REFERENCE.md) -- Platform architecture overview
- [ASTREA_BUSINESS_RULES.md](../project/ASTREA_BUSINESS_RULES.md) -- Role hierarchy, alert escalation, work order lifecycle
