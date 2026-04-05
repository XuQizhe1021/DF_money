@echo off
setlocal
set ROOT=%~dp0..
cd /d "%ROOT%"
powershell -ExecutionPolicy Bypass -File ".\scripts\build_local.ps1"
endlocal
