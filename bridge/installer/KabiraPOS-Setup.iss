; ==============================================================================
; KABIRA POS - PRODUCTION WINDOWS INSTALLER
; ==============================================================================

#define MyAppName "KaBiRa POS"
#define MyAppVersion "2.5.0"
#define MyAppPublisher "KaBiRa POS Systems Corp"
#define MyAppURL "https://kabirapos.com"
#define MyAppExeName "KaBiRaPosBridge.exe"

[Setup]
AppId={{7894A8F1-0B29-4E76-88B9-99412F589A02}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}

AllowNoIcons=yes

OutputDir=..\..\dist\installer
OutputBaseFilename=KabiraPOS-Setup

Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

CloseApplications=yes
RestartApplications=no

UninstallDisplayName={#MyAppName}
Uninstallable=yes

SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

; ==============================================================================
; TASKS
; ==============================================================================

[Tasks]

; Desktop shortcut is enabled by default.
Name: "desktopicon"; \
Description: "{cm:CreateDesktopIcon}"; \
GroupDescription: "{cm:AdditionalIcons}"

; ==============================================================================
; FILES
; ==============================================================================

[Files]

; --------------------------------------------------------------------------
; KaBiRa POS Web Client + Backend
; --------------------------------------------------------------------------
; Current Vite/Node production build is written directly into dist.
; Runtime, Bridge, and installer output are excluded because they are
; installed separately below.
; --------------------------------------------------------------------------

Source: "..\..\dist\*"; \
DestDir: "{app}\Client"; \
Excludes: "runtime\*,bridge\*,installer\*"; \
Flags: ignoreversion recursesubdirs createallsubdirs

; --------------------------------------------------------------------------
; Private Node.js runtime
; --------------------------------------------------------------------------

Source: "..\..\dist\runtime\node.exe"; \
DestDir: "{app}\Runtime"; \
Flags: ignoreversion

; --------------------------------------------------------------------------
; Main KaBiRa POS launcher
; --------------------------------------------------------------------------

Source: "..\Start-KaBiRaPOS.bat"; \
DestDir: "{app}"; \
Flags: ignoreversion

; --------------------------------------------------------------------------
; .NET 8 Hardware Bridge
; --------------------------------------------------------------------------

Source: "..\..\dist\bridge\*"; \
DestDir: "{app}\Bridge"; \
Flags: ignoreversion recursesubdirs createallsubdirs

; --------------------------------------------------------------------------
; Bridge service installation script
; --------------------------------------------------------------------------

Source: "..\install-service.ps1"; \
DestDir: "{app}\Bridge"; \
Flags: ignoreversion

; ==============================================================================
; SHORTCUTS
; ==============================================================================

[Icons]

; Start Menu shortcut launches the POS — NOT the Bridge executable.
Name: "{group}\{#MyAppName}"; \
Filename: "{app}\Start-KaBiRaPOS.bat"; \
WorkingDir: "{app}"

; Desktop shortcut.
Name: "{autodesktop}\{#MyAppName}"; \
Filename: "{app}\Start-KaBiRaPOS.bat"; \
WorkingDir: "{app}"; \
Tasks: desktopicon

; Uninstaller.
Name: "{group}\Uninstall {#MyAppName}"; \
Filename: "{uninstallexe}"

; ==============================================================================
; INSTALL ACTIONS
; ==============================================================================

[Run]

; Install/start the Hardware Bridge Windows service.
Filename: "powershell.exe"; \
Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Bridge\install-service.ps1"" -InstallPath ""{app}\Bridge"""; \
StatusMsg: "Installing KaBiRa POS Hardware Bridge..."; \
Flags: runhidden waituntilterminated

; Launch POS when installation completes.
Filename: "{app}\Start-KaBiRaPOS.bat"; \
Description: "Launch KaBiRa POS"; \
WorkingDir: "{app}"; \
Flags: postinstall nowait skipifsilent

; ==============================================================================
; UNINSTALL
; ==============================================================================

[UninstallRun]

; Stop and remove Hardware Bridge service.
Filename: "powershell.exe"; \
Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Stop-Service -Name 'KaBiRaPOSBridge' -Force -ErrorAction SilentlyContinue; sc.exe delete KaBiRaPOSBridge | Out-Null"""; \
Flags: runhidden waituntilterminated

; Stop only the KaBiRa POS Node backend.
; Double braces are required so Inno Setup passes literal PowerShell braces.
; Do NOT terminate unrelated node.exe processes.
Filename: "powershell.exe"; \
Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' -ErrorAction SilentlyContinue | Where-Object {{ $_.CommandLine -like '*KaBiRa POS*server.cjs*' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}"""; \
Flags: runhidden waituntilterminated

; ==============================================================================
; INSTALL / UPGRADE PROCESS MANAGEMENT
; ==============================================================================

[Code]

procedure StopKaBiRaProcesses();
var
  ResultCode: Integer;
begin

  { -------------------------------------------------------------- }
  { Stop existing Hardware Bridge service before replacing files. }
  { -------------------------------------------------------------- }

  Exec(
    'powershell.exe',
    '-NoProfile -ExecutionPolicy Bypass -Command "Stop-Service -Name ''KaBiRaPOSBridge'' -Force -ErrorAction SilentlyContinue"',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );

  { -------------------------------------------------------------- }
  { Stop ONLY KaBiRa POS Node backend processes.                   }
  { Never kill every node.exe process on the machine.             }
  { Double braces pass literal PowerShell script-block braces.     }
  { -------------------------------------------------------------- }

  Exec(
    'powershell.exe',
    '-NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter ''Name=''''node.exe'''''' -ErrorAction SilentlyContinue | Where-Object {{ $_.CommandLine -like ''*KaBiRa POS*server.cjs*'' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}"',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );

  { Give Windows a moment to release executable/file handles. }

  Sleep(1000);

end;


function PrepareToInstall(var NeedsRestart: Boolean): String;
begin

  StopKaBiRaProcesses();

  NeedsRestart := False;

  Result := '';

end;
