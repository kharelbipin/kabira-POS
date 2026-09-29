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
