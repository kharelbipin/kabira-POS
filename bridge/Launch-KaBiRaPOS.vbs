Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim launcherBat

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
launcherBat = fso.BuildPath(scriptDir, "Start-KaBiRaPOS.bat")

If Not fso.FileExists(launcherBat) Then
    MsgBox "KaBiRa POS launcher was not found:" & vbCrLf & launcherBat, _
           vbCritical, _
           "KaBiRa POS"
    WScript.Quit 1
End If

shell.CurrentDirectory = scriptDir

' Run BAT completely hidden
shell.Run """" & launcherBat & """", 0, False

Set shell = Nothing
Set fso = Nothing
