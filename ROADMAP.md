# expRESTo Middleware Roadmap

## Version 0.x – MVP / Hauptfunktionalität (Early Access)

### Ziele

- Grundlegende Middleware mit Express, CORS, Helmet, Logger, Rate-Limiter
- Dynamisches Laden von Controllern (SimpleController API)
- Konfigurierbarkeit via JSON + Schema-Validierung
- JWT-SecurityProvider mit Basic Auth (Basis)
- Hook-System für Startup, Init, Shutdown
- Prometheus-Client + Metriken für HTTP-Requests
- Eventbus & ServiceRegistry
- Test-Suite mit Unit- und Integrationstests für Kernkomponenten
- CLI-Tool zum Validieren der Konfiguration
- Flexible Konfig-Übergabe (Pfad oder Objekt)
- Fehler-Handling & Shutdown-Handling

### Geplante Releases

- [ ] **0.1.0** – Core Middleware mit Controller Loader, SecurityProvider, Hooks, Logger
- [ ] **0.2.0** – Prometheus-Integration + Metriken für Controller und Services
- [ ] **0.3.0** – Erweiterte Security (Basic Auth + Konfigurationsoptionen)
- [ ] **0.4.0** – CLI-Tool + Tests (Unit + Integration)
- [ ] **0.5.0** – Konfigurationsschema komplett + Validierung + Dokumentation
- [ ] **0.6.0** – Optionale OpenTelemetry-Grundintegration
- [ ] **0.x.y** – Bugfixes und Stabilität

---

## Version 1.0 – Vollständiger Funktionsumfang (Stable Release)

### Ziele

- Erweiterte Controller-API (AdvancedController + Fluent API)
- WebSocket-Unterstützung via socket.io über den Express-Port
- OpenTelemetry komplett integriert mit Feinanalyse in Endpunkten
- Healthcheck- & Config-/Log-Endpunkte über HTTP
- Cluster-Unterstützung per Konfiguration
- Docker-Container mit NGINX + HTTPS-Test-Setup
- Vollständige Dokumentation (Markdown, API, Beispiele)
- Volle Code-Coverage und CI/CD
- Erweiterte Sicherheitsfeatures (z.B. Rollen, Claims)
- Optionales Middleware-Plugin-System für Nutzererweiterungen

### Geplante Releases

- [ ] **1.0.0** – Major Release mit allen Kernfunktionen und stabiler API
- [ ] **1.x.y** – Features, Performance-Optimierungen, Bugfixes

---

## Zeitplan (Beispiel)

| Phase                   | Zeitraum    | Milestone       |
| ----------------------- | ----------- | --------------- |
| MVP-Entwicklung         | 1–3 Monate  | 0.1.0 bis 0.5.0 |
| Erweiterungen & Tests   | 3–6 Monate  | 0.6.x bis 0.9.x |
| Stabile 1.0-Entwicklung | 6–9 Monate  | 1.0.0 Release   |
| Wartung & Features      | fortlaufend | 1.x.y Releases  |

---

# Initiale Ticket-Liste für 0.x Releases

- [ ] **EXP-1:** Core Middleware Setup – Grundlegende Express Middleware mit CORS, Helmet, Logger
- [ ] **EXP-2:** Controller Loader mit dynamischem Import – Dynamisches Laden von Controllern aus konfiguriertem Ordner
- [ ] **EXP-3:** JWT SecurityProvider mit Basic Auth – Implementierung von JWT-Security mit Basic Auth-Optionen
- [ ] **EXP-4:** Hook-System implementieren – Lifecycle Hooks für Startup, Init, Shutdown
- [ ] **EXP-5:** Prometheus Metriken integrieren – Integration von Prometheus Metriken und HTTP-Endpunkt
- [ ] **EXP-6:** CLI Tool zum Validieren der Config – CLI Tool, um JSON-Konfigurationsdatei gegen Schema zu prüfen
- [ ] **EXP-7:** Unit- und Integrationstests – Basis-Test-Suite für Kernkomponenten
- [ ] **EXP-8:** Konfigurationsschema und Validierung vollständig – JSON-Schema fertigstellen und in Validierung einbinden
- [ ] **EXP-9:** Flexible Konfigurationsübergabe – `createServer` akzeptiert Pfad oder Config-Objekt
- [ ] **EXP-10:** Fehlerhandling und Shutdown – Globaler Fehlerhandler und SIGTERM/SIGINT Shutdown

---
