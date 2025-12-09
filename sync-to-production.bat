@echo off
echo ======================================================================
echo   SYNC LOCAL DATABASE TO PRODUCTION
echo ======================================================================
echo.
echo WARNING: This will replace ALL data in production with local data!
echo.
echo This will sync the following collections:
echo   - CPUs
echo   - GPUs (all variants)
echo   - Motherboards
echo   - RAM
echo   - PSUs
echo   - Coolers
echo   - Storage
echo   - Cases
echo   - Add-ons
echo.
echo ======================================================================
echo   IMPORTANT: Make sure you want to proceed!
echo ======================================================================
echo.
pause
echo.
echo Starting database sync...
echo.

node scripts/syncLocalToProduction.js --confirm

echo.
echo ======================================================================
echo   Sync Complete!
echo ======================================================================
echo.
pause
