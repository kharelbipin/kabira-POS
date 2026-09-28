# KABIRA POS — HARDWARE ARCHITECTURE DUPLICATION REPORT

Date: 2026-09-27
Status: Complete Inventory Prior to Consolidation

## 1. DUPLICATE RESPONSIBILITIES & OVERLAPPING SERVICES

| Legacy Service | Responsibilities | Overlaps With | Planned Consolidation |
|---|---|---|---|
| `src/services/posBridge.ts` (1,911 lines) | Device polling, printer assignment, customer display sync, drawer kicking, simulated spooler jobs, local state storage. | `deviceDiscoveryService.ts`, `deviceRegistryService.ts`, `storeRegisterHardwareService.ts`, `webview2Bridge.ts` | Refactor into thin facade delegating to authoritative `src/hardware/BridgeClient.ts` & `src/hardware/HardwareStore.ts`. |
| `src/services/deviceDiscoveryService.ts` (1,587 lines) | Synthetic device discovery, mDNS, SSDP, vendor device enumeration, fake latency fluctuations, simulateDhcpIpShift. | `posBridge.ts`, `storeRegisterHardwareService.ts`, `deviceRegistryService.ts` | Remove synthetic discovery; delegate device querying to `BridgeClient.scanDevices()`. |
| `src/services/storeRegisterHardwareService.ts` (1,516 lines) | Multi-store register mapping, telemetry snapshot, fake Inno Setup/WiX string scripts, JSZip package generator, 1-Click single installer simulation. | `posBridge.ts`, `deviceRegistryService.ts`, `deviceDiscoveryService.ts` | Strip fake installer simulation (`runSingleInstallerSimulation`, fake MZ .exe generation). Keep register store mapping persistence in `HardwareStore`. |
| `src/services/deviceRegistryService.ts` (618 lines) | Multi-state device modeling (windowsDetected, bridgeDetected, etc.), master diagnostics report, 10 troubleshooting tests with Math.random latency. | `deviceState.ts`, `posBridge.ts`, `storeRegisterHardwareService.ts` | Consolidate multi-state modeling into `src/hardware/bridgeTypes.ts` and `BridgeClient.ts`. |
| `src/services/deviceState.ts` (402 lines) | DeviceState class, health badges, diagnostic explanations, buildCoreDeviceStates. | `deviceRegistryService.ts`, `storeRegisterHardwareService.ts` | Consolidate into canonical `src/hardware/bridgeTypes.ts` and `src/hardware/HardwareStore.ts`. |
| `src/services/webview2Bridge.ts` (644 lines) | WebView2 native host bridge, simulated display lists, simulated commands in browser. | `posBridge.ts` | Consolidate into `BridgeClient.ts` (real HTTP to Bridge + optional window message dispatch). |

## 2. DUPLICATE & OVERLAPPING UI SCREENS

| Legacy Screen Component | Lines | Duplicate Functions | Planned Action |
|---|---|---|---|
| `HardwareSettings.tsx` | 1,000+ | Printer discovery, drawer test, display selection, diagnostics log | Consolidate to render authoritative `AdminHardwareManager`. |
| `DeviceManagerView.tsx` | 350+ | Device list, ping, status badges | Deprecate/consolidate into authoritative `AdminHardwareManager`. |
| `WindowsPosManagerTab.tsx` | 700+ | Wraps HardwareDeviceManager + DeviceManagerView + DeviceSetupWizardModal | Consolidate to render authoritative `AdminHardwareManager`. |
| `HardwareDiagnosticsTab.tsx` | 812 | 4-box system matrix, 10-step diagnostic runner, drawer & display test | Consolidate directly into the `Diagnostics` tab of `AdminHardwareManager`. |
| `HardwareDeviceManager.tsx` | 2,400+ | 7 tabs (diagnostics, manager, discovery, single_installer, architecture, deployment, logs), fake single installer simulation console | Consolidate into clean 3-tab architecture: `Devices`, `Configuration`, `Diagnostics`. |
| `PosBridgeHubModal.tsx` | 450+ | Bridge status, test devices, restart service, view logs | Replace with clean status & diagnostic modal connected to `BridgeClient`. |
| `DeviceSetupWizardModal.tsx` | 300+ | Setup wizard simulating device discovery | Refactor to consume real `BridgeClient`. |
| `StartupHealthModal.tsx` | 200+ | Startup modal checking bridge and devices | Refactor to consume real `BridgeClient`. |

## 3. IDENTIFIED SIMULATIONS TO REMOVE FROM PRODUCTION PATHS

1. `storeRegisterHardwareService.ts`:
   - `generateSingleInstallerPackage()` (fake .exe with `'MZ\x90...'` string)
   - `runSingleInstallerSimulation()` (fake progress bar, simulated terminal output)
   - `Math.floor(Math.random() * 4) + 2` fake latency
2. `deviceRegistryService.ts`:
   - `Math.random() * 20` fake diagnostic latency
   - `simulate local pulse` fallback
3. `webview2Bridge.ts`:
   - `simulatedDisplays` array
   - `simulateNativeCommand()` returning hard-coded data
   - `"Fallback to simulated OK if bridge endpoint is local service"`
4. `deviceDiscoveryService.ts`:
   - `simulateDhcpIpShift()`
   - `dev.latencyMs = Math.max(2, ... + Math.floor(Math.random() * 5))`
5. `HardwareDeviceManager.tsx`:
   - Tab `'single_installer'` with simulated Inno Setup / WiX console
   - `handleRunInstallerSimulation`
   - `isSimulatingInstaller` states and simulated terminal logs
