const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: true,
    backgroundColor: '#2d2d2d',
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');

  // Ouvrir les DevTools en développement
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Gestionnaire pour ouvrir le dialogue de sélection de dossier
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// Analyser la structure du dossier
const fs = require('fs');

ipcMain.handle('analyze-folder', async (event, folderPath) => {
  try {
    const analysis = await analyzeFolderStructure(folderPath);
    return analysis;
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    return null;
  }
});

// Fonction pour analyser la structure du dossier
async function analyzeFolderStructure(folderPath) {
  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getItems = (dirPath) => {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
      return [];
    }
  };

  const hasImages = (dirPath) => {
    const items = getItems(dirPath);
    return items.some(item => item.isFile() && isImageFile(item.name));
  };

  const getFolders = (dirPath) => {
    const items = getItems(dirPath);
    return items.filter(item => item.isDirectory()).map(item => item.name);
  };

  const getImages = (dirPath) => {
    const items = getItems(dirPath);
    return items.filter(item => item.isFile() && isImageFile(item.name))
      .map(item => path.join(dirPath, item.name))
      .sort(sortNaturally);
  };

  // Tri naturel (1, 2, 10 au lieu de 1, 10, 2) avec credits à la fin
  const sortNaturally = (a, b) => {
    const aName = path.basename(a).toLowerCase();
    const bName = path.basename(b).toLowerCase();

    // Mettre credits/credi à la fin
    if (aName.includes('credit') || aName.includes('credi')) return 1;
    if (bName.includes('credit') || bName.includes('credi')) return -1;

    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Analyser la profondeur
  const folderName = path.basename(folderPath);

  // Solution 1: Images directement dans le dossier
  if (hasImages(folderPath)) {
    return {
      solution: 1,
      name: folderName,
      structure: {
        chapters: [{
          name: folderName.length > 30 ? 'Chapitre 1' : folderName,
          images: getImages(folderPath)
        }]
      }
    };
  }

  const level1Folders = getFolders(folderPath);
  if (level1Folders.length === 0) {
    return null;
  }

  // Vérifier si les sous-dossiers contiennent des images
  const level1HasImages = level1Folders.some(folder =>
    hasImages(path.join(folderPath, folder))
  );

  // Solution 2: Dossier/Chapitres/Images
  if (level1HasImages) {
    const chapters = level1Folders
      .filter(folder => hasImages(path.join(folderPath, folder)))
      .map(folder => ({
        name: folder,
        images: getImages(path.join(folderPath, folder))
      }))
      .sort((a, b) => sortNaturally(a.name, b.name));

    return {
      solution: 2,
      name: folderName,
      structure: {
        volume: folderName,
        chapters: chapters
      }
    };
  }

  // Vérifier niveau 2
  let level2HasImages = false;
  for (const folder1 of level1Folders) {
    const level2Folders = getFolders(path.join(folderPath, folder1));
    if (level2Folders.some(folder2 =>
      hasImages(path.join(folderPath, folder1, folder2))
    )) {
      level2HasImages = true;
      break;
    }
  }

  // Solution 3: Dossier/Tomes/Chapitres/Images
  if (level2HasImages) {
    const tomes = level1Folders.map(tomeFolder => {
      const tomePath = path.join(folderPath, tomeFolder);
      const chapterFolders = getFolders(tomePath);

      const chapters = chapterFolders
        .filter(chapterFolder => hasImages(path.join(tomePath, chapterFolder)))
        .map(chapterFolder => ({
          name: chapterFolder,
          images: getImages(path.join(tomePath, chapterFolder))
        }))
        .sort((a, b) => sortNaturally(a.name, b.name));

      return {
        name: tomeFolder,
        chapters: chapters
      };
    }).filter(tome => tome.chapters.length > 0)
      .sort((a, b) => sortNaturally(a.name, b.name));

    return {
      solution: 3,
      name: folderName,
      structure: {
        tomes: tomes
      }
    };
  }

  // Solution 4: Dossier/Tomes/Types/Chapitres/Images
  const tomes = level1Folders.map(tomeFolder => {
    const tomePath = path.join(folderPath, tomeFolder);
    const typeFolders = getFolders(tomePath);

    const types = typeFolders.map(typeFolder => {
      const typePath = path.join(tomePath, typeFolder);
      const chapterFolders = getFolders(typePath);

      const chapters = chapterFolders
        .filter(chapterFolder => hasImages(path.join(typePath, chapterFolder)))
        .map(chapterFolder => ({
          name: chapterFolder,
          images: getImages(path.join(typePath, chapterFolder))
        }))
        .sort((a, b) => sortNaturally(a.name, b.name));

      return {
        name: typeFolder,
        chapters: chapters
      };
    }).filter(type => type.chapters.length > 0)
      .sort((a, b) => sortNaturally(a.name, b.name));

    return {
      name: tomeFolder,
      types: types
    };
  }).filter(tome => tome.types.length > 0)
    .sort((a, b) => sortNaturally(a.name, b.name));

  if (tomes.length > 0 && tomes.some(t => t.types.length > 0)) {
    return {
      solution: 4,
      name: folderName,
      structure: {
        tomes: tomes
      }
    };
  }

  return null;
}

// Gestionnaire pour le plein écran
ipcMain.on('toggle-fullscreen', () => {
  const isFullScreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullScreen);
});
