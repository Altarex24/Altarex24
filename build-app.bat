@echo off
echo ========================================
echo    Construction de l'application
echo ========================================
echo.

echo Installation des dependances de build...
call npm install

echo.
echo Construction de l'executable Windows...
call npm run build

echo.
echo ========================================
echo    Construction terminee !
echo ========================================
echo.
echo L'executable se trouve dans le dossier 'dist'
echo Vous pouvez installer l'application en double-cliquant sur le fichier .exe
echo.
pause
