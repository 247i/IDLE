@echo off
call "%~dp0env_for_icons.bat"
if exist "%WINPYDIR%\..\t\VSCodium\VSCodium.exe" (
    "%WINPYDIR%\..\t\VSCodium\VSCodium.exe" %*
) else (
if exist "%LOCALAPPDATA%\Programs\VSCodium\VSCodium.exe" (
    "%LOCALAPPDATA%\Programs\VSCodium\VSCodium.exe"  %*
) else (
    VSCodium %*
))