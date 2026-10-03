using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace KaBiRa.CustomerDisplay;

internal static class Program
{
    private const string MutexName = "KaBiRaPOS-CustomerDisplay-Native";

    [STAThread]
    private static void Main(string[] args)
    {
        using var mutex = new Mutex(true, MutexName, out var createdNew);
        if (!createdNew)
        {
            return;
        }

        ApplicationConfiguration.Initialize();

        var url = GetArg(args, "--url") ?? "http://127.0.0.1:3000/customer-display";
        var fullscreen = !string.Equals(GetArg(args, "--fullscreen"), "false", StringComparison.OrdinalIgnoreCase);

        Application.Run(new CustomerDisplayForm(url, fullscreen));
    }

    private static string? GetArg(string[] args, string name)
    {
        var prefix = name + "=";
        return args.FirstOrDefault(a => a.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            ?.Substring(prefix.Length)
            .Trim('"');
    }
}

internal sealed class CustomerDisplayForm : Form
{
    private readonly string _url;
    private readonly bool _fullscreen;
    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };

    public CustomerDisplayForm(string url, bool fullscreen)
    {
        _url = url;
        _fullscreen = fullscreen;

        Text = "KaBiRa POS Customer Display";
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.Black;
        ShowInTaskbar = true;
        KeyPreview = true;

        var target = Screen.AllScreens.FirstOrDefault(s => !s.Primary) ?? Screen.PrimaryScreen;
        if (target != null)
        {
            Bounds = target.Bounds;
        }

        if (_fullscreen)
        {
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            TopMost = true;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            WindowState = FormWindowState.Maximized;
            TopMost = false;
        }

        Controls.Add(_webView);
        Shown += async (_, _) => await InitializeWebViewAsync();

        FormClosing += (_, e) =>
        {
            if (_fullscreen && ModifierKeys != (Keys.Control | Keys.Shift))
            {
                e.Cancel = true;
            }
        };
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (_fullscreen)
        {
            var altF4 = (keyData & Keys.Alt) == Keys.Alt && (keyData & Keys.F4) == Keys.F4;
            if (altF4 || keyData == Keys.Escape || keyData == Keys.F11)
            {
                return true;
            }
        }

        return base.ProcessCmdKey(ref msg, keyData);
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "KaBiRa POS",
                "CustomerDisplayWebView2"
            );

            Directory.CreateDirectory(userData);

            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            await _webView.EnsureCoreWebView2Async(environment);

            var settings = _webView.CoreWebView2.Settings;
            settings.AreDefaultContextMenusEnabled = false;
            settings.AreDevToolsEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;

            _webView.CoreWebView2.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
            };

            _webView.CoreWebView2.NavigationStarting += (_, e) =>
            {
                if (!e.Uri.StartsWith("http://127.0.0.1:3000", StringComparison.OrdinalIgnoreCase) &&
                    !e.Uri.StartsWith("http://localhost:3000", StringComparison.OrdinalIgnoreCase))
                {
                    e.Cancel = true;
                }
            };

            _webView.Source = new Uri(_url);
            _webView.Focus();
        }
        catch (Exception ex)
        {
            Controls.Clear();
            var panel = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(10, 13, 20) };
            var label = new Label
            {
                Dock = DockStyle.Fill,
                ForeColor = Color.White,
                BackColor = Color.Transparent,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                Text = "KaBiRa POS Customer Display\r\n\r\nUnable to start the embedded display.\r\n" + ex.Message
            };
            panel.Controls.Add(label);
            Controls.Add(panel);
        }
    }
}
