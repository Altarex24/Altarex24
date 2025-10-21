@echo off
echo ========================================
echo    Nettoyage et reinstallation propre
echo ========================================
echo.

REM Supprimer node_modules s'il existe
if exist node_modules (
    echo Suppression de node_modules...
    rmdir /s /q node_modules
    echo OK - node_modules supprime
) else (
    echo node_modules n'existe pas
)

REM Supprimer package-lock.json s'il existe
if exist package-lock.json (
    echo Suppression de package-lock.json...
    del /q package-lock.json
    echo OK - package-lock.json supprime
) else (
    echo package-lock.json n'existe pas
)

echo.
echo Installation des dependances...
call npm install

echo.
echo ========================================
echo    Installation terminee !
echo ========================================
echo.
echo Pour lancer l'application, tapez: npm start
echo Ou double-cliquez sur start.bat
echo.
pause
