@echo off
echo ======================================================================
echo   PC BUILDER COMPREHENSIVE PRICE UPDATER
echo ======================================================================
echo.
echo This script will update price history for ALL components:
echo   - CPUs
echo   - GPUs
echo   - Motherboards
echo   - RAM
echo   - PSUs
echo   - Coolers
echo   - Storage
echo   - Cases
echo   - Add-ons
echo.
echo This may take a while depending on the number of components.
echo.
echo ══════════════════════════════════════════════════════════════════════
echo INTERACTIVE CONTROLS:
echo   Press P           - Pause/Resume the update process
echo   Press Ctrl+C      - Cancel and save progress
echo ══════════════════════════════════════════════════════════════════════
echo.
echo Progress will be saved if you cancel, allowing you to resume later.
echo.
pause
echo.
echo Starting price update...
echo.

node scripts/updateAllComponentPrices.js

echo.
echo ======================================================================
echo   Price Update Complete!
echo ======================================================================
echo.
echo Now purging components without valid pricing...
echo.

node scripts/removeAllComponentsWithoutPrices.js

echo.
echo ======================================================================
echo   All Operations Complete!
echo ======================================================================
echo.
pause
