Set WshShell = CreateObject("WScript.Shell")
If Not WshShell.AppActivate("Bebe Image Editor") Then
    WshShell.Run "cmd /c ""C:\xampp\php\php.exe"" -S 127.0.0.1:8765 -t ""D:\Teste cursor\Bebe Image Editor""", 0, False
    WScript.Sleep 1000
    WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=""http://127.0.0.1:8765/index.php""", 1, False
End If
