@echo off
echo ========================================
echo   Creation du raccourci Manga Reader
echo ========================================
echo.

REM Obtenir le chemin du script actuel
set "SCRIPT_DIR=%~dp0"

REM Créer le fichier VBScript temporaire
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%USERPROFILE%\Desktop\Manga Reader.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_DIR%start.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Manga Reader - Application de lecture de mangas" >> CreateShortcut.vbs
echo oLink.IconLocation = "%SCRIPT_DIR%assets\icon.ico,0" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

REM Executer le script VBScript
cscript CreateShortcut.vbs

REM Supprimer le fichier temporaire
del CreateShortcut.vbs

echo.
echo ========================================
echo   Raccourci cree sur le bureau !
echo ========================================
echo.
pause
