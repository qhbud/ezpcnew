@echo off
echo ========================================
echo  PC Builder Component Finder
echo  GPUs Only
echo  Version 2.0 - Enhanced Filtering
echo ========================================
echo.

set /p GPU_COUNT="How many GPUs do you want to find? (default: 30): "
if "%GPU_COUNT%"=="" set GPU_COUNT=30

echo.
echo Searching for %GPU_COUNT% GPUs...
echo.
echo Enhanced Filtering Features:
echo  * Robust price validation (min $1, max $50k)
echo  * Filters prebuilt PCs and complete systems
echo  * Rejects GPU accessories (brackets, cables, etc.)
echo  * Smart combo product detection
echo  * Ensures variety (max 3 per GPU model)
echo  * Searches NVIDIA RTX, AMD Radeon, Intel Arc
echo  * Multiple price ranges (budget to high-end)
echo.

REM 0 for all other components (GPUs, CPUs, MOBOs, RAM, PSUs, Cases, Coolers, Storage)
node scripts\findNewComponents.js %GPU_COUNT% 0 0 0 0 0 0 0

echo.
echo ========================================
echo  Script completed!
echo ========================================
echo.
echo Check the project directory for the
echo generated JSON file:
echo   new-components-[timestamp].json
echo.
echo All saved GPUs have:
echo  - Valid prices ($1 minimum)
echo  - No prebuilt systems
echo  - No accessories or brackets
echo  - Good variety across models
echo.
pause
