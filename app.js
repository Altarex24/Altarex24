const { ipcRenderer } = require('electron');

// État de l'application
const appState = {
    currentView: 'tomes',
    spacing: 10,
    imageSize: 100,
    theme: 'dark',
    manga: null,
    currentTomeIndex: 0,
    currentTypeIndex: 0,
    currentChapterIndex: 0,
    isFullscreen: false,
    scrollPosition: 0
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    applyTheme(appState.theme);
});

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            handleNavigation(btn.dataset.view);
        });
    });

    // Zone d'importation
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', showImportOptions);
    }

    // Bouton Importer à nouveau
    const reimportBtn = document.getElementById('reimport-btn');
    if (reimportBtn) {
        reimportBtn.addEventListener('click', handleReimport);
    }

    // Contrôle d'espacement
    const spacingSlider = document.getElementById('spacing');
    const spacingValue = document.getElementById('spacing-value');
    spacingSlider.addEventListener('input', (e) => {
        appState.spacing = e.target.value;
        spacingValue.textContent = `${e.target.value}px`;
        updateImageSpacing();
    });

    // Contrôle de taille d'image
    const imageSizeSlider = document.getElementById('image-size');
    const imageSizeValue = document.getElementById('image-size-value');
    imageSizeSlider.addEventListener('input', (e) => {
        appState.imageSize = e.target.value;
        imageSizeValue.textContent = `${e.target.value}%`;
        updateImageSize();
    });

    // Sélecteur de thème
    const themeSelect = document.getElementById('theme');
    themeSelect.addEventListener('change', (e) => {
        appState.theme = e.target.value;
        applyTheme(e.target.value);
    });

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        // Ctrl+/- pour la taille
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                adjustImageSize(10);
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                adjustImageSize(-10);
            }
        }
        // F11 pour le plein écran
        else if (e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        }
        // Escape pour quitter le plein écran
        else if (e.key === 'Escape' && appState.isFullscreen) {
            toggleFullscreen();
        }
    });

    // Écouter les changements de mode plein écran
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Bouton plein écran
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Bouton paramètres
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
        showSettings();
    });

    // Détection du scroll
    const mainContent = document.querySelector('.main-content');
    mainContent.addEventListener('scroll', handleScroll);
}

// Gérer la navigation
function handleNavigation(view) {
    if (!appState.manga) return;

    const solution = appState.manga.solution;

    if (solution === 1) {
        // Pas de navigation pour solution 1
        return;
    }

    if (solution === 2) {
        // Navigation par chapitres uniquement
        if (view === 'chapitres') {
            showChapterSelector();
        }
    }

    if (solution === 3) {
        // Navigation par tomes et chapitres
        if (view === 'tomes') {
            showTomeSelector();
        } else if (view === 'chapitres') {
            showChapterSelector();
        }
    }

    if (solution === 4) {
        // Navigation complète
        if (view === 'tomes') {
            showTomeSelector();
        } else if (view === 'type') {
            showTypeSelector();
        } else if (view === 'chapitres') {
            showChapterSelector();
        }
    }
}

// Gérer l'importation de dossier
async function handleImportFolder() {
    try {
        const folderPath = await ipcRenderer.invoke('select-folder');

        if (folderPath) {
            showNotification('Analyse du dossier en cours...', 'info');

            const analysis = await ipcRenderer.invoke('analyze-folder', folderPath);

            if (!analysis) {
                showNotification('Aucun manga trouvé dans ce dossier', 'error');
                return;
            }

            console.log('Analyse:', analysis);

            appState.manga = analysis;
            appState.currentTomeIndex = 0;
            appState.currentTypeIndex = 0;
            appState.currentChapterIndex = 0;

            // Masquer la zone d'importation
            document.getElementById('import-zone').style.display = 'none';
            document.getElementById('manga-viewer').style.display = 'block';

            // Mettre à jour la navigation
            updateNavigationButtons();

            // Afficher le premier chapitre
            displayCurrentChapter();

            showNotification(`Manga importé! (Solution ${analysis.solution})`, 'success');
            updateReimportButton();
        }
    } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
        showNotification('Erreur lors de l\'importation', 'error');
    }
}

// Gérer l'importation d'images directes (Solution 5)
async function handleImportImages() {
    try {
        const imagePaths = await ipcRenderer.invoke('select-images');

        if (imagePaths && imagePaths.length > 0) {
            showNotification(`${imagePaths.length} images sélectionnées`, 'info');

            // Trier les images naturellement avec credits à la fin
            const sortedImages = imagePaths.sort((a, b) => {
                const aName = a.toLowerCase();
                const bName = b.toLowerCase();

                // Mettre credits/credi à la fin
                if (aName.includes('credit') || aName.includes('credi')) return 1;
                if (bName.includes('credit') || bName.includes('credi')) return -1;

                return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
            });

            // Créer une structure de manga avec solution 5
            appState.manga = {
                solution: 5,
                name: 'Images importées',
                structure: {
                    chapters: [{
                        name: 'Chapitre',
                        images: sortedImages
                    }]
                }
            };

            appState.currentTomeIndex = 0;
            appState.currentTypeIndex = 0;
            appState.currentChapterIndex = 0;

            // Masquer la zone d'importation
            document.getElementById('import-zone').style.display = 'none';
            document.getElementById('manga-viewer').style.display = 'block';

            // Mettre à jour la navigation
            updateNavigationButtons();

            // Afficher les images
            displayCurrentChapter();

            showNotification('Images importées!', 'success');
            updateReimportButton();
        }
    } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
        showNotification('Erreur lors de l\'importation', 'error');
    }
}

// Afficher les options d'importation
function showImportOptions() {
    const modal = createModal('Choisissez le type d\'importation', [
        {
            text: '📁 Importer un dossier de manga',
            onClick: () => {
                closeModal();
                handleImportFolder();
            }
        },
        {
            text: '🖼️ Importer des images',
            onClick: () => {
                closeModal();
                handleImportImages();
            }
        }
    ]);

    document.body.appendChild(modal);
}

// Gérer la réimportation
function handleReimport() {
    // Réinitialiser l'état
    appState.manga = null;
    appState.currentTomeIndex = 0;
    appState.currentTypeIndex = 0;
    appState.currentChapterIndex = 0;

    // Masquer le visualiseur et afficher la zone d'importation
    document.getElementById('manga-viewer').style.display = 'none';
    document.getElementById('import-zone').style.display = 'flex';

    // Masquer le bouton Importer à nouveau
    updateReimportButton();

    showNotification('Prêt pour une nouvelle importation', 'info');
}

// Mettre à jour la visibilité du bouton Importer à nouveau
function updateReimportButton() {
    const reimportBtn = document.getElementById('reimport-btn');
    if (reimportBtn) {
        // Afficher seulement si on a un manga chargé et qu'on n'est pas en plein écran
        if (appState.manga && !appState.isFullscreen) {
            reimportBtn.style.display = 'inline-block';
        } else {
            reimportBtn.style.display = 'none';
        }
    }
}

// Mettre à jour les boutons de navigation
function updateNavigationButtons() {
    const navbar = document.querySelector('.navbar-left');
    const solution = appState.manga.solution;

    // Retirer les boutons actuels
    navbar.innerHTML = '';

    if (solution === 1) {
        // Solution 1: Afficher seulement le chapitre
        const chapterBtn = createNavButton(appState.manga.structure.chapters[0].name, 'chapitres', false);
        navbar.appendChild(chapterBtn);
    } else if (solution === 2) {
        // Solution 2: Volume et Chapitres
        const volumeBtn = createNavButton(appState.manga.structure.volume, 'volume', false);
        const chapterBtn = createNavButton('Chapitres', 'chapitres', true);
        navbar.appendChild(volumeBtn);
        navbar.appendChild(chapterBtn);
    } else if (solution === 3) {
        // Solution 3: Tomes et Chapitres
        const tomeBtn = createNavButton('Tomes', 'tomes', true);
        const chapterBtn = createNavButton('Chapitres', 'chapitres', true);
        navbar.appendChild(tomeBtn);
        navbar.appendChild(chapterBtn);
    } else if (solution === 4) {
        // Solution 4: Tomes, Types et Chapitres
        const tomeBtn = createNavButton('Tomes', 'tomes', true);
        const typeBtn = createNavButton('Types', 'type', true);
        const chapterBtn = createNavButton('Chapitres', 'chapitres', true);
        navbar.appendChild(tomeBtn);
        navbar.appendChild(typeBtn);
        navbar.appendChild(chapterBtn);
    } else if (solution === 5) {
        // Solution 5: Images directes - Afficher seulement le nom
        const chapterBtn = createNavButton('Images importées', 'chapitres', false);
        navbar.appendChild(chapterBtn);
    }

    // Mettre à jour les noms actuels
    updateCurrentNames();
}

// Créer un bouton de navigation
function createNavButton(text, view, clickable) {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.textContent = text;
    btn.dataset.view = view;

    if (clickable) {
        btn.addEventListener('click', () => handleNavigation(view));
    } else {
        btn.style.cursor = 'default';
        btn.classList.add('active');
    }

    return btn;
}

// Mettre à jour les noms actuels dans la navigation
function updateCurrentNames() {
    const solution = appState.manga.solution;
    const buttons = document.querySelectorAll('.nav-btn');

    if (solution === 3) {
        const currentTome = appState.manga.structure.tomes[appState.currentTomeIndex];
        buttons[0].textContent = currentTome.name;

        const currentChapter = currentTome.chapters[appState.currentChapterIndex];
        buttons[1].textContent = currentChapter.name;
    } else if (solution === 4) {
        const currentTome = appState.manga.structure.tomes[appState.currentTomeIndex];
        buttons[0].textContent = currentTome.name;

        const currentType = currentTome.types[appState.currentTypeIndex];
        buttons[1].textContent = currentType.name;

        const currentChapter = currentType.chapters[appState.currentChapterIndex];
        buttons[2].textContent = currentChapter.name;
    }
}

// Afficher le chapitre actuel
function displayCurrentChapter() {
    const solution = appState.manga.solution;
    let images = [];

    if (solution === 1 || solution === 5) {
        images = appState.manga.structure.chapters[0].images;
    } else if (solution === 2) {
        images = appState.manga.structure.chapters[appState.currentChapterIndex].images;
    } else if (solution === 3) {
        const tome = appState.manga.structure.tomes[appState.currentTomeIndex];
        images = tome.chapters[appState.currentChapterIndex].images;
    } else if (solution === 4) {
        const tome = appState.manga.structure.tomes[appState.currentTomeIndex];
        const type = tome.types[appState.currentTypeIndex];
        images = type.chapters[appState.currentChapterIndex].images;
    }

    displayImages(images);
}

// Afficher les images
function displayImages(images) {
    const viewer = document.getElementById('image-container');
    viewer.innerHTML = '';

    images.forEach((imagePath, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-wrapper';
        imgWrapper.style.marginBottom = `${appState.spacing}px`;

        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = `Page ${index + 1}`;
        img.className = 'manga-page';

        // Appliquer la taille directement à l'image
        const baseWidth = 900;
        const width = baseWidth * (appState.imageSize / 100);
        img.style.width = `${width}px`;
        img.style.maxWidth = 'none';

        // Marquer la dernière image
        if (index === images.length - 1) {
            imgWrapper.dataset.lastPage = 'true';
        }

        imgWrapper.appendChild(img);
        viewer.appendChild(imgWrapper);
    });

    // Créer les boutons de navigation en bas
    createBottomNavigation();

    // Scroller tout en haut
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}

// Créer les boutons de navigation en bas
function createBottomNavigation() {
    const lastImageWrapper = document.querySelector('[data-last-page="true"]');
    if (!lastImageWrapper) return;

    const navContainer = document.createElement('div');
    navContainer.className = 'bottom-navigation';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-bottom-btn';
    prevBtn.innerHTML = '⬅️ Chapitre précédent';
    prevBtn.onclick = () => navigateChapter(-1);

    const topBtn = document.createElement('button');
    topBtn.className = 'nav-bottom-btn';
    topBtn.innerHTML = '⬆️ Remonter';
    topBtn.onclick = () => {
        document.querySelector('.main-content').scrollTop = 0;
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-bottom-btn';
    nextBtn.innerHTML = 'Chapitre suivant ➡️';
    nextBtn.onclick = () => navigateChapter(1);

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(topBtn);
    navContainer.appendChild(nextBtn);

    lastImageWrapper.appendChild(navContainer);

    // Désactiver les boutons si nécessaire
    if (!canNavigateChapter(-1)) prevBtn.disabled = true;
    if (!canNavigateChapter(1)) nextBtn.disabled = true;
}

// Naviguer entre les chapitres
function navigateChapter(direction) {
    const solution = appState.manga.solution;

    if (solution === 1) {
        return; // Pas de navigation
    } else if (solution === 2) {
        const chapters = appState.manga.structure.chapters;
        appState.currentChapterIndex += direction;

        if (appState.currentChapterIndex < 0) appState.currentChapterIndex = 0;
        if (appState.currentChapterIndex >= chapters.length) {
            appState.currentChapterIndex = chapters.length - 1;
        }
    } else if (solution === 3) {
        navigateSolution3(direction);
    } else if (solution === 4) {
        navigateSolution4(direction);
    }

    updateCurrentNames();
    displayCurrentChapter();
}

// Navigation pour solution 3
function navigateSolution3(direction) {
    const tomes = appState.manga.structure.tomes;
    const currentTome = tomes[appState.currentTomeIndex];
    const chapters = currentTome.chapters;

    appState.currentChapterIndex += direction;

    // Si on sort des chapitres, changer de tome
    if (appState.currentChapterIndex < 0) {
        if (appState.currentTomeIndex > 0) {
            appState.currentTomeIndex--;
            appState.currentChapterIndex = tomes[appState.currentTomeIndex].chapters.length - 1;
        } else {
            appState.currentChapterIndex = 0;
        }
    } else if (appState.currentChapterIndex >= chapters.length) {
        if (appState.currentTomeIndex < tomes.length - 1) {
            appState.currentTomeIndex++;
            appState.currentChapterIndex = 0;
        } else {
            appState.currentChapterIndex = chapters.length - 1;
        }
    }
}

// Navigation pour solution 4
function navigateSolution4(direction) {
    const tomes = appState.manga.structure.tomes;
    const currentTome = tomes[appState.currentTomeIndex];
    const currentType = currentTome.types[appState.currentTypeIndex];
    const chapters = currentType.chapters;

    appState.currentChapterIndex += direction;

    // Si on sort des chapitres
    if (appState.currentChapterIndex < 0) {
        // Essayer le type précédent
        if (appState.currentTypeIndex > 0) {
            appState.currentTypeIndex--;
            const prevType = currentTome.types[appState.currentTypeIndex];
            appState.currentChapterIndex = prevType.chapters.length - 1;
        } else if (appState.currentTomeIndex > 0) {
            // Essayer le tome précédent
            appState.currentTomeIndex--;
            const prevTome = tomes[appState.currentTomeIndex];
            appState.currentTypeIndex = prevTome.types.length - 1;
            appState.currentChapterIndex = prevTome.types[appState.currentTypeIndex].chapters.length - 1;
        } else {
            appState.currentChapterIndex = 0;
        }
    } else if (appState.currentChapterIndex >= chapters.length) {
        // Essayer le type suivant
        if (appState.currentTypeIndex < currentTome.types.length - 1) {
            appState.currentTypeIndex++;
            appState.currentChapterIndex = 0;
        } else if (appState.currentTomeIndex < tomes.length - 1) {
            // Essayer le tome suivant
            appState.currentTomeIndex++;
            appState.currentTypeIndex = 0;
            appState.currentChapterIndex = 0;
        } else {
            appState.currentChapterIndex = chapters.length - 1;
        }
    }
}

// Vérifier si on peut naviguer
function canNavigateChapter(direction) {
    const solution = appState.manga.solution;

    if (solution === 1) return false;

    if (solution === 2) {
        const chapters = appState.manga.structure.chapters;
        if (direction < 0) return appState.currentChapterIndex > 0;
        return appState.currentChapterIndex < chapters.length - 1;
    }

    if (solution === 3) {
        const tomes = appState.manga.structure.tomes;
        if (direction < 0) {
            return appState.currentTomeIndex > 0 || appState.currentChapterIndex > 0;
        } else {
            const lastTome = tomes[tomes.length - 1];
            return appState.currentTomeIndex < tomes.length - 1 ||
                   appState.currentChapterIndex < tomes[appState.currentTomeIndex].chapters.length - 1;
        }
    }

    if (solution === 4) {
        const tomes = appState.manga.structure.tomes;
        if (direction < 0) {
            return appState.currentTomeIndex > 0 ||
                   appState.currentTypeIndex > 0 ||
                   appState.currentChapterIndex > 0;
        } else {
            const currentTome = tomes[appState.currentTomeIndex];
            const currentType = currentTome.types[appState.currentTypeIndex];
            return appState.currentTomeIndex < tomes.length - 1 ||
                   appState.currentTypeIndex < currentTome.types.length - 1 ||
                   appState.currentChapterIndex < currentType.chapters.length - 1;
        }
    }

    return false;
}

// Afficher le sélecteur de tome
function showTomeSelector() {
    if (!appState.manga) return;

    const solution = appState.manga.solution;
    if (solution < 3) return;

    const tomes = appState.manga.structure.tomes;

    const modal = createModal('Sélectionner un tome', tomes.map((tome, index) => ({
        text: tome.name,
        onClick: () => {
            appState.currentTomeIndex = index;
            appState.currentTypeIndex = 0;
            appState.currentChapterIndex = 0;
            updateCurrentNames();
            displayCurrentChapter();
            closeModal();
        }
    })));

    document.body.appendChild(modal);
}

// Afficher le sélecteur de type
function showTypeSelector() {
    if (!appState.manga || appState.manga.solution !== 4) return;

    const currentTome = appState.manga.structure.tomes[appState.currentTomeIndex];
    const types = currentTome.types;

    const modal = createModal('Sélectionner un type', types.map((type, index) => ({
        text: type.name,
        onClick: () => {
            appState.currentTypeIndex = index;
            appState.currentChapterIndex = 0;
            updateCurrentNames();
            displayCurrentChapter();
            closeModal();
        }
    })));

    document.body.appendChild(modal);
}

// Afficher le sélecteur de chapitre
function showChapterSelector() {
    if (!appState.manga) return;

    const solution = appState.manga.solution;
    let chapters = [];

    if (solution === 1) {
        return; // Pas de sélection pour solution 1
    } else if (solution === 2) {
        chapters = appState.manga.structure.chapters;
    } else if (solution === 3) {
        chapters = appState.manga.structure.tomes[appState.currentTomeIndex].chapters;
    } else if (solution === 4) {
        const tome = appState.manga.structure.tomes[appState.currentTomeIndex];
        chapters = tome.types[appState.currentTypeIndex].chapters;
    }

    const modal = createModal('Sélectionner un chapitre', chapters.map((chapter, index) => ({
        text: chapter.name,
        onClick: () => {
            appState.currentChapterIndex = index;
            updateCurrentNames();
            displayCurrentChapter();
            closeModal();
        }
    })));

    document.body.appendChild(modal);
}

// Créer un modal
function createModal(title, items) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = closeModal;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => e.stopPropagation();

    const modalTitle = document.createElement('h2');
    modalTitle.textContent = title;
    modalTitle.className = 'modal-title';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'modal-item';
        btn.textContent = item.text;
        btn.onclick = item.onClick;
        modalContent.appendChild(btn);
    });

    modal.appendChild(modalTitle);
    modal.appendChild(modalContent);
    overlay.appendChild(modal);

    return overlay;
}

// Fermer le modal
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Gérer le scroll
function handleScroll(e) {
    appState.scrollPosition = e.target.scrollTop;
    updateScrollButton();
}

// Mettre à jour le bouton de scroll
function updateScrollButton() {
    let scrollBtn = document.getElementById('scroll-top-btn');

    // Ne pas afficher en mode plein écran
    if (appState.isFullscreen) {
        if (scrollBtn) scrollBtn.remove();
        return;
    }

    // Afficher si on a scrollé plus de 300px
    if (appState.scrollPosition > 300) {
        if (!scrollBtn) {
            scrollBtn = document.createElement('button');
            scrollBtn.id = 'scroll-top-btn';
            scrollBtn.className = 'scroll-top-btn';
            scrollBtn.innerHTML = '⬆️';
            scrollBtn.onclick = () => {
                document.querySelector('.main-content').scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            };
            document.body.appendChild(scrollBtn);
        }
    } else {
        if (scrollBtn) scrollBtn.remove();
    }
}

// Mettre à jour l'espacement des images
function updateImageSpacing() {
    const wrappers = document.querySelectorAll('.image-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.style.marginBottom = `${appState.spacing}px`;
    });
}

// Mettre à jour la taille des images - SYSTÈME SIMPLE
function updateImageSize() {
    const images = document.querySelectorAll('.manga-page');
    const baseWidth = 900;
    const newWidth = baseWidth * (appState.imageSize / 100);

    images.forEach(img => {
        img.style.width = `${newWidth}px`;
        img.style.maxWidth = 'none';
    });
}

// Ajuster la taille d'image avec les raccourcis
function adjustImageSize(delta) {
    let newSize = parseInt(appState.imageSize) + delta;
    newSize = Math.max(50, Math.min(150, newSize)); // Limiter entre 50% et 150%

    appState.imageSize = newSize;
    document.getElementById('image-size').value = newSize;
    document.getElementById('image-size-value').textContent = `${newSize}%`;
    updateImageSize();
}

// Basculer le mode plein écran
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Entrer en plein écran
        document.documentElement.requestFullscreen().then(() => {
            appState.isFullscreen = true;
            document.body.classList.add('fullscreen-mode');
            ipcRenderer.send('set-fullscreen', true);
            updateScrollButton();
            updateReimportButton();
        }).catch(err => {
            console.error('Erreur plein écran:', err);
        });
    } else {
        // Quitter le plein écran
        document.exitFullscreen().then(() => {
            appState.isFullscreen = false;
            document.body.classList.remove('fullscreen-mode');
            ipcRenderer.send('set-fullscreen', false);
            updateScrollButton();
            updateReimportButton();
        });
    }
}

// Gérer les changements de mode plein écran (ex: F11, Escape)
function handleFullscreenChange() {
    if (!document.fullscreenElement) {
        appState.isFullscreen = false;
        document.body.classList.remove('fullscreen-mode');
        ipcRenderer.send('set-fullscreen', false);
        updateScrollButton();
        updateReimportButton();
    } else {
        appState.isFullscreen = true;
        document.body.classList.add('fullscreen-mode');
        ipcRenderer.send('set-fullscreen', true);
        updateScrollButton();
        updateReimportButton();
    }
}

// Appliquer le thème
function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('light-theme', 'forest-theme', 'night-theme', 'autumn-theme');

    switch(theme) {
        case 'light':
            body.classList.add('light-theme');
            break;
        case 'forest':
            body.classList.add('forest-theme');
            break;
        case 'night':
            body.classList.add('night-theme');
            break;
        case 'autumn':
            body.classList.add('autumn-theme');
            break;
    }
}

// Afficher les paramètres
function showSettings() {
    showNotification('Paramètres à venir!', 'info');
}

// Système de notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'success' ? '#4ade80' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
