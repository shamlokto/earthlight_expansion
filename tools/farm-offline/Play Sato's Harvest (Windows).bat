@echo off
rem Sato's Harvest offline: starts the built-in local server (serve.ps1) and opens the game in your browser.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
