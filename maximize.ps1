Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@
Start-Sleep -Milliseconds 100
for ($i = 0; $i -lt 10; $i++) {
    $h = [Win]::GetForegroundWindow()
    if ($h -ne 0) {
        [Win]::ShowWindow($h, 3)
        break
    }
    Start-Sleep -Milliseconds 100
}
