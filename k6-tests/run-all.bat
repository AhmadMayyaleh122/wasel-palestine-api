@echo off
echo ============================================
echo   Wasel Palestine API - k6 Performance Tests
echo ============================================
echo.

mkdir results 2>nul

echo [1/5] Running Read-Heavy Workload Test...
k6 run --summary-export=results/01-read-heavy.json 01-read-heavy.js 2>&1 | tee results/01-read-heavy.txt
echo.

echo [2/5] Running Write-Heavy Workload Test...
k6 run --summary-export=results/02-write-heavy.json 02-write-heavy.js 2>&1 | tee results/02-write-heavy.txt
echo.

echo [3/5] Running Mixed Workload Test...
k6 run --summary-export=results/03-mixed-workload.json 03-mixed-workload.js 2>&1 | tee results/03-mixed-workload.txt
echo.

echo [4/5] Running Spike Test...
k6 run --summary-export=results/04-spike-test.json 04-spike-test.js 2>&1 | tee results/04-spike-test.txt
echo.

echo [5/5] Running Soak Test...
k6 run --summary-export=results/05-soak-test.json 05-soak-test.js 2>&1 | tee results/05-soak-test.txt
echo.

echo ============================================
echo   All tests complete! Results in ./results/
echo ============================================
