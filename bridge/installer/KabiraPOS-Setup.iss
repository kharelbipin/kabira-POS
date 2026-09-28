; ==============================================================================
; KABIRA POS - ONE-CLICK WINDOWS INSTALLER COMPILER SCRIPT (Inno Setup 6)
; Compiles: dist/installer/KabiraPOS-Setup.exe
; Customer Experience: Download -> Double-click -> Install -> Finish (0 manual configs)
; ==============================================================================

#define MyAppName "KaBiRa POS"
#define MyAppVersion "2.4.1"
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
SetupIconFile=..\..\public\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Launch KaBiRa POS Bridge automatically when Windows starts"; GroupDescription: "Windows Integration:"

[Files]
; 1. KaBiRa POS Web Client Application Artifacts
Source: "..\..\dist\web\*"; DestDir: "{app}\Client"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. KaBiRa Local Hardware Bridge (.NET 8 Native Windows Service)
Source: "..\..\dist\bridge\*"; DestDir: "{app}\Bridge"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. Service Management Scripts
Source: "..\install-service.ps1"; DestDir: "{app}\Bridge"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName} Bridge Service"; Filename: "{app}\Bridge\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\Client\index.html"; Tasks: desktopicon

[Run]
; 1. Register, start, and verify Windows Background Service automatically
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\Bridge\install-service.ps1"" -InstallPath ""{app}\Bridge"""; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Service -Name KaBiRaPOSBridge -Force -ErrorAction SilentlyContinue; sc.exe delete KaBiRaPOSBridge"""; Flags: runhidden
