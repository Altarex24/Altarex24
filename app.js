const { ipcRenderer } = require('electron');

// État de l'application
const appState = {
    currentView: 'tomes',
    spacing: 10,
    theme: 'dark',
    mangas: []
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
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.currentView = btn.dataset.view;
            console.log('Vue actuelle:', appState.currentView);
        });
    });

    // Zone d'importation
    const importZone = document.getElementById('import-zone');
    importZone.addEventListener('click', handleImport);

    // Contrôle d'espacement
    const spacingSlider = document.getElementById('spacing');
    const spacingValue = document.getElementById('spacing-value');
    spacingSlider.addEventListener('input', (e) => {
        appState.spacing = e.target.value;
        spacingValue.textContent = `${e.target.value}px`;
        updateMangaGrid();
    });

    // Sélecteur de thème
    const themeSelect = document.getElementById('theme');
    themeSelect.addEventListener('change', (e) => {
        appState.theme = e.target.value;
        applyTheme(e.target.value);
    });

    // Bouton plein écran
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.addEventListener('click', () => {
        ipcRenderer.send('toggle-fullscreen');
    });

    // Bouton paramètres
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
        showSettings();
    });
}

// Gérer l'importation de fichier
async function handleImport() {
    try {
        const filePath = await ipcRenderer.invoke('select-file');

        if (filePath) {
            console.log('Fichier sélectionné:', filePath);

            // Créer un objet manga
            const manga = {
                id: Date.now(),
                title: extractFileName(filePath),
                path: filePath,
                type: 'Manga',
                chapters: 0
            };

            // Ajouter à la liste
            appState.mangas.push(manga);

            // Masquer la zone d'importation et afficher la grille
            document.getElementById('import-zone').style.display = 'none';
            document.getElementById('manga-grid').style.display = 'grid';

            // Mettre à jour l'affichage
            updateMangaGrid();

            // Animation de succès
            showNotification('Manga importé avec succès!', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
        showNotification('Erreur lors de l\'importation', 'error');
    }
}

// Extraire le nom du fichier
function extractFileName(filePath) {
    const parts = filePath.split(/[\\\/]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.[^/.]+$/, ''); // Retirer l'extension
}

// Mettre à jour la grille de mangas
function updateMangaGrid() {
    const mangaGrid = document.getElementById('manga-grid');
    mangaGrid.style.gap = `${appState.spacing}px`;

    // Afficher les mangas
    mangaGrid.innerHTML = appState.mangas.map(manga => `
        <div class="manga-item" data-id="${manga.id}">
            <div class="manga-cover">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px;">
                    📖
                </div>
            </div>
            <div class="manga-info">
                <div class="manga-title">${manga.title}</div>
                <div class="manga-details">${manga.type} • ${manga.chapters} chapitres</div>
            </div>
        </div>
    `).join('');

    // Ajouter les événements de clic sur les mangas
    const mangaItems = mangaGrid.querySelectorAll('.manga-item');
    mangaItems.forEach(item => {
        item.addEventListener('click', () => {
            const mangaId = parseInt(item.dataset.id);
            const manga = appState.mangas.find(m => m.id === mangaId);
            if (manga) {
                openManga(manga);
            }
        });
    });
}

// Ouvrir un manga
function openManga(manga) {
    console.log('Ouverture du manga:', manga);
    showNotification(`Ouverture de ${manga.title}...`, 'info');
    // Ici on ajoutera la logique de lecture plus tard
}

// Appliquer le thème
function applyTheme(theme) {
    const body = document.body;

    // Retirer tous les thèmes
    body.classList.remove('light-theme', 'forest-theme', 'night-theme');

    // Appliquer le nouveau thème
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
        default:
            // dark theme (par défaut)
            break;
    }

    console.log('Thème appliqué:', theme);
}

// Afficher les paramètres
function showSettings() {
    showNotification('Paramètres à venir!', 'info');
    console.log('Ouverture des paramètres');
}

// Système de notifications
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Styles inline pour la notification
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

    // Ajouter au body
    document.body.appendChild(notification);

    // Retirer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Ajouter les animations pour les notifications
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
