@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo.
  echo A instalacao terminou com erro. Consulte a mensagem acima e o arquivo INICIAR.md.
)
echo.
pause
exit /b %RESULT%
