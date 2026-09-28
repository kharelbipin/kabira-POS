# KABIRA POS - WINDOWS HARDWARE BRIDGE & DEPLOYMENT ARCHITECTURE

## 1. System Architecture

```
KaBiRa POS Web/React UI (Port 3000 / WebView2 Host)
        |
        | HTTP Loopback / WebSocket / SSE
        v
KaBiRa POS Local Hardware Bridge (127.0.0.1:5055)
        |
        +-- Windows Device Discovery Subsystem
        |     +-- Windows Installed Printers (Win32 Spooler / WMI)
        |     +-- USB / PnP Peripherals (HID Keyboards, Scanners, Barcode Readers)
        |     +-- COM / RS-232 Serial Ports (Weight Scales, PinPads)
        |     +-- Multi-Monitor Windows Displays (Primary Cashier + Secondary Customer Display)
        |     +-- Active Network Interfaces & LAN Subnet
        |
        +-- LAN POS Device Discovery
        |     +-- mDNS / Bonjour
        |     +-- SSDP / UPnP
        |     +-- Port 9100 Raw Thermal Socket Discovery
        |
        +-- Hardware Adapters
              +-- Receipt Printer Adapter (ESC/POS 24V, Star Line Mode, Citizen)
              +-- Cash Drawer Adapter (Printer RJ11/RJ12 Relay & Direct USB/Serial Kick)
              +-- Barcode Scanner Adapter (USB HID Wedge & Virtual COM)
              +-- Customer Display Adapter (Windows Extended Desktop Mirroring & Broadcast Channel)
              +-- Weight Scale Adapter (Mettler Toledo / NCI Standard)
```

## 2. Hardware Bridge REST API Endpoints (Port 5055)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bridge/health` | Returns service status (`running`, `starting`, `offline`), heartbeat, and machine name |
| `GET` | `/api/bridge/version` | Returns Bridge version (`2.4.1-LTS`) and runtime details |
| `POST` | `/api/hardware/scan` | Triggers master hardware scan (Windows Printers, USB/PnP, Displays, LAN) |
| `GET` | `/api/hardware/devices` | Returns all discovered peripherals with stable hardware IDs |
| `GET` | `/api/hardware/summary` | Returns deduplicated hardware counts across all subsystems |
| `POST` | `/api/hardware/:deviceId/test` | Runs a diagnostic communication test on a specific device |
| `GET` | `/api/printers` | Enumerates real installed Windows print queues and network printers |
| `POST` | `/api/printers/:deviceId/test-print` | Dispatches a physical test receipt to the selected printer |
| `POST` | `/api/drawer/open` | Sends manufacturer-supported solenoid kick pulse through printer adapter |
| `GET` | `/api/displays` | Enumerates real physical displays (Primary & Extended Customer Display) |
| `POST` | `/api/displays/:deviceId/test` | Physically opens the test customer display window on the selected monitor |
| `GET` | `/api/network/status` | Reports active network adapter, IP, subnet, and detected POS nodes |
| `GET` | `/api/bridge/logs` | Structured audit trail of hardware operations (no sensitive customer data) |

## 3. Production vs. Development Modes

- **Production Mode (`hardwareMode = 'bridge'`)**:
  - The POS communicates directly with `http://127.0.0.1:5055`.
  - If the Bridge is offline or stopped, the POS reports: **`HARDWARE BRIDGE UNAVAILABLE`**.
  - **Zero fake devices are fabricated**. If no printers or secondary screens are connected, the count is truthfully 0.
- **Development / Demo Mode (`hardwareMode = 'mock'`)**:
  - Used only when explicitly enabled by an administrator for testing without physical peripherals.
  - Prominently displays `[DEMO / MOCK MODE ACTIVE]`.

## 4. One-Click Windows Installer (`KabiraPOS-Setup.exe`)

The installer is built using Inno Setup 6 (`bridge/installer/KabiraPOS-Setup.iss`):
1. Installs the KaBiRa POS client application.
2. Installs the KaBiRa POS Hardware Bridge service binaries in `C:\Program Files\KaBiRa POS\Bridge`.
3. Registers the Windows Service:
   - Service Name: `KaBiRaPOSBridge`
   - Display Name: `KaBiRa POS Hardware Bridge`
   - Startup Type: `Automatic`
   - Failure Recovery: Auto-Restart on failure (`sc.exe failure KaBiRaPOSBridge reset= 86400 actions= restart/5000/restart/10000/restart/60000`).
4. Configures Windows Firewall loopback exception for port 5055.
5. Starts the service immediately upon installation.

## 5. First-Run Commissioning Workflow

1. After install, administrator opens `Admin -> Hardware -> Hardware Diagnostics`.
2. System tests:
   - Bridge Service Heartbeat (Port 5055)
   - Windows Printer Spooler Queues
   - Windows Multi-Monitor Displays
   - USB / HID Devices
   - LAN Network Adapter & Subnet
3. Administrator maps:
   - **Receipt Printer**: Selected from real detected Windows queues.
   - **Cash Drawer**: Configured via Receipt Printer RJ11/RJ12 drawer port.
   - **Customer Display**: Selected from real detected extended screens (e.g. `DISPLAY2`).
4. Administrator clicks **[Test Print]**, **[Test Open]**, and **[Test Display]** to verify each physical peripheral.
