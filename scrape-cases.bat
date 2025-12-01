@echo off
echo ========================================
echo    PC Case Database Populator
echo ========================================
echo.
echo This will scrape and populate 30+ PC cases
echo with form factor, color, and RGB information.
echo.
echo Press Ctrl+C to cancel, or
pause

node scripts/populateCases.js

echo.
echo ========================================
echo    Population Complete!
echo ========================================
pause
