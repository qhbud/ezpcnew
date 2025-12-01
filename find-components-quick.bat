@echo off
echo ========================================
echo  PC Builder Component Finder (Quick)
echo  Version 2.0 - Enhanced Filtering
echo ========================================
echo.
echo Running with default settings:
echo  - 20 of each component type
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
echo.
echo This may take 10-15 minutes...
echo.

node scripts\findNewComponents.js 20 20 20 20 20 20 20 20

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
