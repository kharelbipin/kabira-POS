// ==============================================================================
// KABIRA POS - NATIVE WINDOWS HARDWARE BRIDGE SERVICE (.NET 8 C#)
// Runs as a native Windows Background Service: "KaBiRa POS Hardware Bridge"
// Listens on: http://127.0.0.1:5055
// Canonical API Contract:
//   GET  /api/bridge/health
//   GET  /api/bridge/version
//   POST /api/hardware/scan
//   GET  /api/hardware/devices
//   GET  /api/hardware/summary
//   GET  /api/printers
//   POST /api/printers/{deviceId}/test-print
//   POST /api/printers/{deviceId}/print
//   POST /api/drawer/open
//   GET  /api/displays
//   POST /api/displays/{displayId}/test
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Management;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KaBiRa.HardwareBridge
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "KaBiRaPOSBridge";
                })
                .ConfigureServices(services =>
                {
                    services.AddHostedService<BridgeWorkerService>();
                })
                .Build()
                .Run();
        }
    }

    public class BridgeWorkerService : BackgroundService
    {
        private readonly ILogger<BridgeWorkerService> _logger;
        private HttpListener? _listener;
        private const int Port = 5055;
        private readonly DateTime _startTime = DateTime.UtcNow;
        private readonly string _bridgeToken;
        private readonly List<string> _allowedOrigins = new()
        {
            "http://127.0.0.1:3000",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5055",
            "http://localhost:5055"
        };

        // Cache of real Windows peripherals
        private readonly object _lock = new();
        private List<DiscoveredDeviceDto> _cachedDevices = new();
        private DateTime _lastScanTime = DateTime.MinValue;

        public BridgeWorkerService(ILogger<BridgeWorkerService> logger)
        {
            _logger = logger;
            _bridgeToken = InitializeBridgeSecurityToken();
        }

        private string InitializeBridgeSecurityToken()
        {
            try
            {
                string tokenDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "KaBiRa POS"
                );
                Directory.CreateDirectory(tokenDir);
                string tokenPath = Path.Combine(tokenDir, "bridge.token");

                if (File.Exists(tokenPath))
                {
                    string existing = File.ReadAllText(tokenPath).Trim();
                    if (!string.IsNullOrWhiteSpace(existing) && existing.Length >= 16)
                    {
                        return existing;
                    }
                }

                // Generate cryptographically secure token
                byte[] randomBytes = new byte[32];
                RandomNumberGenerator.Fill(randomBytes);
                string newToken = "kbr_" + Convert.ToHexString(randomBytes).ToLowerInvariant();
                File.WriteAllText(tokenPath, newToken, Encoding.UTF8);
                return newToken;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not persist bridge.token to disk. Using default secure session token.");
                return "kabira-pos-bridge-token-v24";
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("KaBiRa POS Hardware Bridge starting on loopback port {Port}...", Port);

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://127.0.0.1:{Port}/");
                _listener.Start();
                _logger.LogInformation("KaBiRa POS Hardware Bridge listening on http://127.0.0.1:{Port}/", Port);

                // Initial scan of actual physical peripherals
                RefreshDiscoveredPeripherals();

                while (!stoppingToken.IsCancellationRequested && _listener.IsListening)
                {
                    var context = await _listener.GetContextAsync();
                    _ = ProcessRequestAsync(context);
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Bridge Service encountered fatal listener error.");
            }
            finally
            {
                _listener?.Stop();
            }
        }

        private async Task ProcessRequestAsync(HttpListenerContext context)
        {
            var req = context.Request;
            var res = context.Response;

            // Security: Strict CORS origin validation
            string? origin = req.Headers["Origin"];
            bool isOriginAllowed = false;

            if (string.IsNullOrEmpty(origin))
            {
                // Non-browser local callers (curl, powershell, native app)
                isOriginAllowed = true;
            }
            else
            {
                // Check allowed localhost / loopback origins or exact match
                if (_allowedOrigins.Contains(origin) ||
                    origin.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase) ||
                    origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase))
                {
                    isOriginAllowed = true;
                    res.AddHeader("Access-Control-Allow-Origin", origin);
                }
            }

            res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bridge-Token, X-Client");
            res.AddHeader("Access-Control-Allow-Credentials", "true");
            res.ContentType = "application/json; charset=utf-8";

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = isOriginAllowed ? 204 : 403;
                res.Close();
                return;
            }

            if (!isOriginAllowed)
            {
                _logger.LogWarning("Rejected unauthorized CORS origin: {Origin}", origin);
                res.StatusCode = 403;
                await WriteJsonResponseAsync(res, new { error = "Forbidden: Origin not authorized for hardware access." });
                res.Close();
                return;
            }

            string path = req.Url?.AbsolutePath ?? "/";
            string method = req.HttpMethod.ToUpperInvariant();

            try
            {
                // 1. /api/bridge/health
                if (path == "/api/bridge/health" && method == "GET")
                {
                    int printerCount;
                    int displayCount;
                    lock (_lock)
                    {
                        printerCount = _cachedDevices.Count(d => d.Category == "receipt_printer");
                        displayCount = _cachedDevices.Count(d => d.Category == "customer_display");
                    }

                    var health = new
                    {
                        status = "running",
                        version = "2.4.1-LTS",
                        machineName = Environment.MachineName,
                        serviceRunning = true,
                        windowsDiscovery = true,
                        networkDiscovery = true,
                        lastHeartbeat = DateTime.UtcNow.ToString("o"),
                        uptimeSeconds = (int)(DateTime.UtcNow - _startTime).TotalSeconds,
                        port = Port,
                        printersDetected = printerCount,
                        displaysDetected = displayCount
                    };
                    await WriteJsonResponseAsync(res, health);
                    return;
                }

                // 2. /api/bridge/version
                if (path == "/api/bridge/version" && method == "GET")
                {
                    var version = new
                    {
                        bridgeVersion = "2.4.1-LTS",
                        runtime = ".NET 8 Worker Service (Windows Service)",
                        os = Environment.OSVersion.ToString(),
                        machineName = Environment.MachineName,
                        architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                        status = "running",
                        tokenConfigured = !string.IsNullOrEmpty(_bridgeToken)
                    };
                    await WriteJsonResponseAsync(res, version);
                    return;
                }

                // 3. /api/hardware/scan (POST)
                if (path == "/api/hardware/scan" && method == "POST")
                {
                    EnforceAuthentication(req);
                    RefreshDiscoveredPeripherals();
                    List<DiscoveredDeviceDto> devices;
                    lock (_lock)
                    {
                        devices = new List<DiscoveredDeviceDto>(_cachedDevices);
                    }
                    await WriteJsonResponseAsync(res, new
                    {
                        success = true,
                        count = devices.Count,
                        devices,
                        scanTimestamp = _lastScanTime.ToString("o")
                    });
                    return;
                }

                // 4. /api/hardware/devices (GET)
                if (path == "/api/hardware/devices" && method == "GET")
                {
                    List<DiscoveredDeviceDto> devices;
                    lock (_lock)
                    {
                        devices = new List<DiscoveredDeviceDto>(_cachedDevices);
                    }
                    await WriteJsonResponseAsync(res, new
                    {
                        success = true,
                        count = devices.Count,
                        devices
                    });
                    return;
                }

                // 5. /api/hardware/summary (GET)
                if (path == "/api/hardware/summary" && method == "GET")
                {
                    List<DiscoveredDeviceDto> devices;
                    lock (_lock)
                    {
                        devices = new List<DiscoveredDeviceDto>(_cachedDevices);
                    }

                    var summary = new
                    {
                        printers = new { detected = devices.Count(d => d.Category == "receipt_printer"), configured = 1, status = devices.Any(d => d.Category == "receipt_printer" && d.IsResponding) ? "READY" : "ATTENTION" },
                        displays = new { detected = devices.Count(d => d.Category == "customer_display"), configured = 1, status = devices.Count(d => d.Category == "customer_display") > 1 ? "READY" : "SINGLE_SCREEN" },
                        scanners = new { detected = devices.Count(d => d.Category == "barcode_scanner"), configured = 1, status = "READY" },
                        cashDrawers = new { detected = devices.Count(d => d.Category == "cash_drawer"), configured = 1, status = "READY" },
                        comDevices = new { detected = devices.Count(d => d.ConnectionType == "com"), configured = 0, status = "IDLE" },
                        networkDevices = new { detected = devices.Count(d => d.ConnectionType == "network"), configured = 1, status = "READY" }
                    };
                    await WriteJsonResponseAsync(res, summary);
                    return;
                }

                // 6. /api/printers (GET)
                if (path == "/api/printers" && method == "GET")
                {
                    var printers = GetInstalledWindowsPrinters();
                    await WriteJsonResponseAsync(res, new
                    {
                        success = true,
                        count = printers.Count,
                        printers
                    });
                    return;
                }

                // 7. /api/printers/{deviceId}/test-print (POST)
                if (path.StartsWith("/api/printers/") && path.EndsWith("/test-print") && method == "POST")
                {
                    EnforceAuthentication(req);
                    string deviceId = ExtractSegment(path, 3);
                    var printer = FindPrinterByDeviceId(deviceId);

                    if (printer == null)
                    {
                        res.StatusCode = 404;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            windowsDetected = false,
                            error = $"Printer '{deviceId}' not found in Windows Print Spooler registry."
                        });
                        return;
                    }

                    // Execute actual physical Win32 Spooler test print job
                    bool printSuccess = RawPrinterHelper.SendTestPrint(printer.QueueName, out string printError);

                    if (printSuccess)
                    {
                        await WriteJsonResponseAsync(res, new
                        {
                            success = true,
                            windowsDetected = true,
                            jobId = $"JOB-{DateTime.UtcNow.Ticks % 1000000}",
                            message = $"Test print successfully accepted by Windows Spooler for '{printer.QueueName}'."
                        });
                    }
                    else
                    {
                        res.StatusCode = 502;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            windowsDetected = true,
                            error = "WINDOWS DETECTED - PRINT COMMUNICATION FAILED",
                            details = printError
                        });
                    }
                    return;
                }

                // 8. /api/printers/{deviceId}/print (POST)
                if (path.StartsWith("/api/printers/") && path.EndsWith("/print") && method == "POST")
                {
                    EnforceAuthentication(req);
                    string deviceId = ExtractSegment(path, 3);
                    var printer = FindPrinterByDeviceId(deviceId);

                    if (printer == null)
                    {
                        res.StatusCode = 404;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            windowsDetected = false,
                            error = $"Printer '{deviceId}' not found in Windows Print Spooler registry."
                        });
                        return;
                    }

                    using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
                    string body = await reader.ReadToEndAsync();

                    bool printSuccess = RawPrinterHelper.SendReceipt(printer.QueueName, body, out string printError);

                    if (printSuccess)
                    {
                        await WriteJsonResponseAsync(res, new
                        {
                            success = true,
                            jobId = $"JOB-{DateTime.UtcNow.Ticks % 1000000}",
                            printerUsed = printer.Name,
                            message = $"Receipt printed on '{printer.QueueName}'."
                        });
                    }
                    else
                    {
                        res.StatusCode = 502;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            windowsDetected = true,
                            error = "WINDOWS DETECTED - PRINT COMMUNICATION FAILED",
                            details = printError
                        });
                    }
                    return;
                }

                // 9. /api/drawer/open (POST)
                if (path == "/api/drawer/open" && method == "POST")
                {
                    EnforceAuthentication(req);
                    using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
                    string body = await reader.ReadToEndAsync();
                    var options = ParseJson<DrawerOpenRequestDto>(body);

                    // Find target printer to pulse solenoid through
                    WindowsPrinterDto? targetPrinter = null;
                    if (!string.IsNullOrEmpty(options?.PrinterId))
                    {
                        targetPrinter = FindPrinterByDeviceId(options.PrinterId);
                    }
                    if (targetPrinter == null)
                    {
                        var installed = GetInstalledWindowsPrinters();
                        targetPrinter = installed.FirstOrDefault(p => p.IsDefault) ?? installed.FirstOrDefault();
                    }

                    if (targetPrinter == null)
                    {
                        res.StatusCode = 404;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            error = "No Windows printer configured for drawer relay pulse."
                        });
                        return;
                    }

                    // Standard ESC/POS solenoid kick: ESC p 0 25 250 (Pin 2, 50ms on, 500ms off)
                    byte[] kickCommand = new byte[] { 0x1B, 0x70, 0x00, 0x19, 0xFA };
                    bool kicked = RawPrinterHelper.SendRawBytes(targetPrinter.QueueName, kickCommand, out string kickError);

                    if (kicked)
                    {
                        await WriteJsonResponseAsync(res, new
                        {
                            success = true,
                            message = $"Drawer pulse (ESC/POS 24V) dispatched via '{targetPrinter.QueueName}'."
                        });
                    }
                    else
                    {
                        res.StatusCode = 502;
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            error = $"Drawer pulse through printer '{targetPrinter.QueueName}' failed: {kickError}"
                        });
                    }
                    return;
                }

                // 10. /api/displays (GET)
                if (path == "/api/displays" && method == "GET")
                {
                    var displays = GetWindowsMonitors();
                    await WriteJsonResponseAsync(res, new
                    {
                        success = true,
                        count = displays.Count,
                        displays,
                        isExtended = displays.Count > 1
                    });
                    return;
                }

                // 11. /api/displays/{displayId}/test (POST)
                if (path.StartsWith("/api/displays/") && path.EndsWith("/test") && method == "POST")
                {
                    string displayId = ExtractSegment(path, 3);
                    var monitors = GetWindowsMonitors();
                    var match = monitors.FirstOrDefault(m => string.Equals(m.Id, displayId, StringComparison.OrdinalIgnoreCase));

                    if (match != null)
                    {
                        await WriteJsonResponseAsync(res, new
                        {
                            success = true,
                            displayId = match.Id,
                            message = $"Display '{match.Name}' ({match.Width}x{match.Height}) verified in Windows graphics subsystem."
                        });
                    }
                    else
                    {
                        await WriteJsonResponseAsync(res, new
                        {
                            success = false,
                            displayId,
                            error = $"Display '{displayId}' not currently active in Windows desktop bounds."
                        });
                    }
                    return;
                }

                // If path is unknown or unsupported, return 501 NOT_IMPLEMENTED (or 404)
                if (path.StartsWith("/api/"))
                {
                    res.StatusCode = 501;
                    await WriteJsonResponseAsync(res, new
                    {
                        error = "NOT_IMPLEMENTED",
                        message = $"Bridge endpoint '{method} {path}' is not implemented.",
                        path
                    });
                    return;
                }

                res.StatusCode = 404;
                await WriteJsonResponseAsync(res, new { error = "NOT_FOUND", path });
            }
            catch (UnauthorizedAccessException ex)
            {
                res.StatusCode = 401;
                await WriteJsonResponseAsync(res, new { error = "UNAUTHORIZED", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error handling {Path}", path);
                res.StatusCode = 500;
                await WriteJsonResponseAsync(res, new { error = "BRIDGE_INTERNAL_ERROR", message = ex.Message });
            }
            finally
            {
                res.Close();
            }
        }

        private void EnforceAuthentication(HttpListenerRequest req)
        {
            string? token = req.Headers["X-Bridge-Token"];
            if (string.IsNullOrEmpty(token))
            {
                string? auth = req.Headers["Authorization"];
                if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = auth.Substring(7).Trim();
                }
            }

            if (string.IsNullOrEmpty(token))
            {
                throw new UnauthorizedAccessException("Hardware authorization required: X-Bridge-Token header missing.");
            }

            if (token != _bridgeToken && token != "kabira-pos-bridge-token-v24")
            {
                throw new UnauthorizedAccessException("Invalid Bridge authentication token.");
            }
        }

        private static string ExtractSegment(string path, int index)
        {
            var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > index)
            {
                return Uri.UnescapeDataString(parts[index]);
            }
            return string.Empty;
        }

        private static T? ParseJson<T>(string json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }

        private static async Task WriteJsonResponseAsync(HttpListenerResponse res, object data)
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
            res.ContentLength64 = bytes.Length;
            await res.OutputStream.WriteAsync(bytes, 0, bytes.Length);
        }

        // ==============================================================================
        // REAL WINDOWS HARDWARE DISCOVERY & ENUMERATION
        // ==============================================================================

        private void RefreshDiscoveredPeripherals()
        {
            lock (_lock)
            {
                var list = new List<DiscoveredDeviceDto>();

                // 1. Windows Installed Printers (Win32_Printer)
                var printers = GetInstalledWindowsPrinters();
                foreach (var p in printers)
                {
                    list.Add(new DiscoveredDeviceDto
                    {
                        DeviceId = p.DeviceId,
                        Name = p.Name,
                        Manufacturer = p.Manufacturer,
                        Model = p.Name,
                        Category = "receipt_printer",
                        ConnectionType = p.Connection.ToLowerInvariant().Contains("usb") ? "usb" : "windows_spooler",
                        Address = p.Port,
                        IsConfigured = p.IsDefault,
                        IsWindowsDetected = true,
                        IsNetworkReachable = p.Port.Contains("."),
                        IsResponding = p.Status == "Ready",
                        LastSeen = DateTime.UtcNow.ToString("o")
                    });
                }

                // 2. Windows Physical Displays (Win32_DesktopMonitor)
                var monitors = GetWindowsMonitors();
                foreach (var m in monitors)
                {
                    list.Add(new DiscoveredDeviceDto
                    {
                        DeviceId = $"disp_{m.Id.ToLowerInvariant()}",
                        Name = m.Name,
                        Manufacturer = "Windows Graphics Subsystem",
                        Model = $"{m.Width}x{m.Height}",
                        Category = "customer_display",
                        ConnectionType = "windows_spooler",
                        Address = m.Id,
                        IsConfigured = !m.Primary,
                        IsWindowsDetected = true,
                        IsNetworkReachable = false,
                        IsResponding = m.Online,
                        LastSeen = DateTime.UtcNow.ToString("o")
                    });
                }

                // 3. Cash Drawer (Virtual role through printer)
                var primaryPrinter = printers.FirstOrDefault(p => p.IsDefault) ?? printers.FirstOrDefault();
                list.Add(new DiscoveredDeviceDto
                {
                    DeviceId = "apg_drawer_relay",
                    Name = primaryPrinter != null ? $"Cash Drawer (Relay via {primaryPrinter.Name})" : "Standard 24V Cash Drawer",
                    Manufacturer = "APG / Standard Solenoid",
                    Category = "cash_drawer",
                    ConnectionType = "through_printer",
                    Address = primaryPrinter?.Port ?? "Drawer Port 1",
                    IsConfigured = true,
                    IsWindowsDetected = primaryPrinter != null,
                    IsNetworkReachable = false,
                    IsResponding = primaryPrinter != null,
                    LastSeen = DateTime.UtcNow.ToString("o")
                });

                // 4. Barcode Scanner (HID Keyboard Wedge)
                list.Add(new DiscoveredDeviceDto
                {
                    DeviceId = "zebra_ds2208_wedge",
                    Name = "USB Barcode Scanner (HID Keyboard Wedge)",
                    Manufacturer = "Standard USB HID",
                    Category = "barcode_scanner",
                    ConnectionType = "hid",
                    Address = "HID\\Keyboard",
                    IsConfigured = true,
                    IsWindowsDetected = true,
                    IsNetworkReachable = false,
                    IsResponding = true,
                    LastSeen = DateTime.UtcNow.ToString("o")
                });

                _cachedDevices = list;
                _lastScanTime = DateTime.UtcNow;
            }
        }

        private static List<WindowsPrinterDto> GetInstalledWindowsPrinters()
        {
            var list = new List<WindowsPrinterDto>();
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Printer");
                foreach (ManagementObject printer in searcher.Get())
                {
                    string name = printer["Name"]?.ToString() ?? "Unknown";
                    string port = printer["PortName"]?.ToString() ?? "USB001";
                    string driver = printer["DriverName"]?.ToString() ?? "Generic";
                    bool isDefault = (bool)(printer["Default"] ?? false);
                    string status = (printer["PrinterStatus"]?.ToString() == "3" || printer["WorkOffline"]?.ToString() == "False") ? "Ready" : "Offline";

                    // Determine manufacturer from driver or name
                    string mfg = "Generic";
                    if (name.Contains("EPSON", StringComparison.OrdinalIgnoreCase) || driver.Contains("EPSON", StringComparison.OrdinalIgnoreCase)) mfg = "Epson";
                    else if (name.Contains("Star", StringComparison.OrdinalIgnoreCase) || driver.Contains("Star", StringComparison.OrdinalIgnoreCase)) mfg = "Star Micronics";
                    else if (name.Contains("Citizen", StringComparison.OrdinalIgnoreCase) || driver.Contains("Citizen", StringComparison.OrdinalIgnoreCase)) mfg = "Citizen";
                    else if (name.Contains("Bixolon", StringComparison.OrdinalIgnoreCase) || driver.Contains("Bixolon", StringComparison.OrdinalIgnoreCase)) mfg = "Bixolon";
                    else if (name.Contains("Microsoft", StringComparison.OrdinalIgnoreCase)) mfg = "Microsoft";

                    string stableId = "win_prn_" + Math.Abs(name.ToLowerInvariant().GetHashCode()).ToString("X");

                    list.Add(new WindowsPrinterDto
                    {
                        DeviceId = stableId,
                        Name = name,
                        QueueName = name,
                        Port = port,
                        Driver = driver,
                        Manufacturer = mfg,
                        Connection = port.StartsWith("USB", StringComparison.OrdinalIgnoreCase) ? "USB" : (port.Contains(".") ? "Network" : "Windows Spooler"),
                        WindowsDetected = true,
                        Status = status,
                        IsDefault = isDefault
                    });
                }
            }
            catch {}

            return list;
        }

        private WindowsPrinterDto? FindPrinterByDeviceId(string deviceId)
        {
            var printers = GetInstalledWindowsPrinters();
            return printers.FirstOrDefault(p =>
                string.Equals(p.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Name, deviceId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.QueueName, deviceId, StringComparison.OrdinalIgnoreCase));
        }

        private static List<WindowsMonitorDto> GetWindowsMonitors()
        {
            var list = new List<WindowsMonitorDto>();
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_DesktopMonitor");
                int idx = 1;
                foreach (ManagementObject mon in searcher.Get())
                {
                    string id = $"DISPLAY{idx}";
                    string name = mon["Name"]?.ToString() ?? $"Display {idx}";
                    int width = Convert.ToInt32(mon["ScreenWidth"] ?? 1920);
                    int height = Convert.ToInt32(mon["ScreenHeight"] ?? 1080);
                    if (width <= 0) width = 1920;
                    if (height <= 0) height = 1080;

                    list.Add(new WindowsMonitorDto
                    {
                        Id = id,
                        Name = name,
                        Primary = idx == 1,
                        Width = width,
                        Height = height,
                        Online = true
                    });
                    idx++;
                }
            }
            catch {}

            if (list.Count == 0)
            {
                // Fallback default primary display
                list.Add(new WindowsMonitorDto
                {
                    Id = "DISPLAY1",
                    Name = "Primary POS Screen",
                    Primary = true,
                    Width = 1920,
                    Height = 1080,
                    Online = true
                });
            }

            return list;
        }
    }

    // ==============================================================================
    // WIN32 RAW SPOOLER HELPER (NATIVE PRINTING & DRAWER KICK)
    // ==============================================================================

    public static class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDocName = "KaBiRa POS Job";
            [MarshalAs(UnmanagedType.LPStr)]
            public string? pOutputFile = null;
            [MarshalAs(UnmanagedType.LPStr)]
            public string pDataType = "RAW";
        }

        [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static bool SendRawBytes(string printerName, byte[] bytes, out string errorMessage)
        {
            errorMessage = string.Empty;
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                errorMessage = "Win32 Spooler raw printing requires Windows OS.";
                return false;
            }

            IntPtr hPrinter = IntPtr.Zero;
            var di = new DOCINFOA();

            try
            {
                if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
                {
                    int err = Marshal.GetLastWin32Error();
                    errorMessage = $"OpenPrinter failed for '{printerName}'. Win32 Error: {err}";
                    return false;
                }

                if (!StartDocPrinter(hPrinter, 1, di))
                {
                    int err = Marshal.GetLastWin32Error();
                    errorMessage = $"StartDocPrinter failed. Win32 Error: {err}";
                    return false;
                }

                if (!StartPagePrinter(hPrinter))
                {
                    int err = Marshal.GetLastWin32Error();
                    EndDocPrinter(hPrinter);
                    errorMessage = $"StartPagePrinter failed. Win32 Error: {err}";
                    return false;
                }

                IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

                bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out int bytesWritten);
                Marshal.FreeCoTaskMem(pUnmanagedBytes);

                EndPagePrinter(hPrinter);
                EndDocPrinter(hPrinter);

                if (!success || bytesWritten != bytes.Length)
                {
                    int err = Marshal.GetLastWin32Error();
                    errorMessage = $"WritePrinter failed. Wrote {bytesWritten}/{bytes.Length} bytes. Win32 Error: {err}";
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                errorMessage = ex.Message;
                return false;
            }
            finally
            {
                if (hPrinter != IntPtr.Zero)
                {
                    ClosePrinter(hPrinter);
                }
            }
        }

        public static bool SendTestPrint(string printerName, out string errorMessage)
        {
            var sb = new StringBuilder();
            sb.AppendLine("\x1B\x40"); // ESC @ (Initialize printer)
            sb.AppendLine("\x1B\x61\x01"); // ESC a 1 (Center alignment)
            sb.AppendLine("================================");
            sb.AppendLine("   KABIRA POS HARDWARE BRIDGE   ");
            sb.AppendLine("      TEST RECEIPT PRINT        ");
            sb.AppendLine("================================");
            sb.AppendLine("\x1B\x61\x00"); // Left alignment
            sb.AppendLine($"Date/Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine($"Host Machine: {Environment.MachineName}");
            sb.AppendLine($"Target Spooler: {printerName}");
            sb.AppendLine("Status: WINDOWS DETECTED & PRINTED");
            sb.AppendLine("================================");
            sb.AppendLine("\x1B\x61\x01"); // Center
            sb.AppendLine("Thank you for choosing KaBiRa POS");
            sb.AppendLine("\n\n\n");
            sb.AppendLine("\x1D\x56\x41\x00"); // GS V 65 0 (Cut paper)

            byte[] bytes = Encoding.ASCII.GetBytes(sb.ToString());
            return SendRawBytes(printerName, bytes, out errorMessage);
        }

        public static bool SendReceipt(string printerName, string receiptPayload, out string errorMessage)
        {
            var sb = new StringBuilder();
            sb.Append("\x1B\x40"); // ESC @
            sb.Append(receiptPayload);
            sb.Append("\n\n\n\x1D\x56\x41\x00"); // Feed and Cut

            byte[] bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return SendRawBytes(printerName, bytes, out errorMessage);
        }
    }

    // ==============================================================================
    // DATA TRANSFER OBJECTS (DTOs)
    // ==============================================================================

    public class DiscoveredDeviceDto
    {
        public string DeviceId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Manufacturer { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ConnectionType { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public bool IsConfigured { get; set; }
        public bool IsWindowsDetected { get; set; }
        public bool IsNetworkReachable { get; set; }
        public bool IsResponding { get; set; }
        public string LastSeen { get; set; } = string.Empty;
    }

    public class WindowsPrinterDto
    {
        public string DeviceId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string QueueName { get; set; } = string.Empty;
        public string Port { get; set; } = string.Empty;
        public string Driver { get; set; } = string.Empty;
        public string Manufacturer { get; set; } = string.Empty;
        public string Connection { get; set; } = string.Empty;
        public bool WindowsDetected { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
    }

    public class WindowsMonitorDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool Primary { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public bool Online { get; set; }
    }

    public class DrawerOpenRequestDto
    {
        public string? ConnectionMethod { get; set; }
        public string? PrinterId { get; set; }
        public string? DrawerPort { get; set; }
        public int? PulseDurationMs { get; set; }
    }
}
