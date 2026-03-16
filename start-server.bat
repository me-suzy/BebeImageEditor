@echo off
cd /d "%~dp0"
set "PORT=8765"
echo Bebe Image Editor - pornesc server PHP pe http://127.0.0.1:%PORT%
echo.
echo Deschide in browser: http://127.0.0.1:%PORT%
echo (Daca vezi "Connection Refused", verifica ca acest fereastra sa ramana deschisa.)
echo.
php -S 127.0.0.1:%PORT% -t .
pause
