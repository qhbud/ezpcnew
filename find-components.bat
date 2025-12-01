@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  PC Builder Component Finder
echo  Version 2.0 - Enhanced Filtering
echo ========================================
echo.
echo This script will search Amazon for new PC components.
echo Enter the number of items you want to find for each category.
echo Enter 0 to skip a category.
echo Press ENTER to use the default value.
echo.

REM Prompt for each component type
set /p GPU_COUNT="How many GPUs? (default: 20): "
if "%GPU_COUNT%"=="" set GPU_COUNT=20

set /p CPU_COUNT="How many CPUs? (default: 20): "
if "%CPU_COUNT%"=="" set CPU_COUNT=20

set /p MOBO_COUNT="How many Motherboards? (default: 20): "
if "%MOBO_COUNT%"=="" set MOBO_COUNT=20

set /p RAM_COUNT="How many RAM modules? (default: 20): "
if "%RAM_COUNT%"=="" set RAM_COUNT=20

set /p PSU_COUNT="How many PSUs? (default: 20): "
if "%PSU_COUNT%"=="" set PSU_COUNT=20

set /p CASE_COUNT="How many Cases? (default: 20): "
if "%CASE_COUNT%"=="" set CASE_COUNT=20

set /p COOLER_COUNT="How many Coolers? (default: 20): "
if "%COOLER_COUNT%"=="" set COOLER_COUNT=20

set /p STORAGE_COUNT="How many Storage devices? (default: 20): "
if "%STORAGE_COUNT%"=="" set STORAGE_COUNT=20

echo.
echo ========================================
echo  Summary
echo ========================================
echo GPUs:         %GPU_COUNT%
echo CPUs:         %CPU_COUNT%
echo Motherboards: %MOBO_COUNT%
echo RAM:          %RAM_COUNT%
echo PSUs:         %PSU_COUNT%
echo Cases:        %CASE_COUNT%
echo Coolers:      %COOLER_COUNT%
echo Storage:      %STORAGE_COUNT%
echo ========================================
echo.
echo Enhanced Filtering Features:
echo  * Robust price validation (min $1, max $50k)
echo  * Filters prebuilt PCs and complete systems
echo  * Rejects cables and accessories
echo  * Blocks memory cards and portable storage
echo  * Improved RAM speed detection (MT/s support)
echo  * Smart combo product detection
echo  * Ensures variety (max 3 similar items)
echo  * Searches multiple price ranges
echo ========================================
echo.

set /p CONFIRM="Continue with these settings? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo Operation cancelled.
    echo.
    pause
    exit /b
)

echo.
echo ========================================
echo  Starting component search...
echo ========================================
echo.
echo This may take several minutes depending on
echo the number of components you're searching for.
echo.
echo The script will:
echo  - Search Amazon for each component type
echo  - Validate prices (must be $1-$50,000)
echo  - Filter out prebuilt PCs and systems
echo  - Reject cables, accessories, and memory cards
echo  - Ensure variety in specifications
echo  - Save only valid components to JSON file
echo.

REM Run the Node.js script with arguments
node scripts\findNewComponents.js %GPU_COUNT% %CPU_COUNT% %MOBO_COUNT% %RAM_COUNT% %PSU_COUNT% %CASE_COUNT% %COOLER_COUNT% %STORAGE_COUNT%

echo.
echo ========================================
echo  Script completed!
echo ========================================
echo.
echo Check the project directory for the
echo generated JSON file:
echo   new-components-[timestamp].json
echo.
echo All saved components have:
echo  - Valid prices ($1 minimum)
echo  - No prebuilt systems
echo  - No cables or accessories
echo  - Proper variety and specifications
echo.
pause
