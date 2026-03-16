Set WshShell = CreateObject("WScript.Shell")

WshShell.Run Chr(34) & "C:\Program Files\Google\Chrome\Application\chrome.exe" & Chr(34) & " --start-maximized --window-size=1920,1080 --app=http://localhost/bebe/index.php", 1, False

WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & "D:\Teste cursor\Bebe Image Editor\maximize.ps1" & Chr(34), 0, False
