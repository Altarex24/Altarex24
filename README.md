# 📖 Manga Reader - Application Windows

Application de bureau stylée et complète pour gérer et lire vos mangas sur Windows.

![Logo](assets/logo.svg)

## ✨ Fonctionnalités

### 🎨 Interface Moderne
- **Design élégant** avec animations fluides
- **5 thèmes disponibles** :
  - 🌑 **Sombre** (par défaut) - Gris foncé élégant
  - ☀️ **Lumineux** - Clair et moderne
  - 🌲 **Forêt** - Tons verts apaisants
  - 🌙 **Nuit** - Complètement noir
  - 🍂 **Automne** - Tons bruns chaleureux

### 📁 Importation Intelligente (5 Solutions)

L'application détecte automatiquement la structure de vos mangas :

**Solution 1** - Images directes dans un dossier :
```
MonManga/
  ├── page1.jpg
  ├── page2.jpg
  └── page3.jpg
```

**Solution 2** - Dossier/Chapitres/Images :
```
MonManga/
  ├── Chapitre 1/
  │   ├── page1.jpg
  └── Chapitre 2/
      ├── page1.jpg
```

**Solution 3** - Dossier/Tomes/Chapitres/Images :
```
MonManga/
  ├── Tome 1/
  │   ├── Chapitre 1/
  │   └── Chapitre 2/
  └── Tome 2/
```

**Solution 4** - Dossier/Tomes/Types/Chapitres/Images :
```
MonManga/
  ├── Tome 1/
  │   ├── Principal/
  │   │   └── Chapitre 1/
  │   └── Bonus/
  └── Tome 2/
```

**Solution 5** - Importation directe d'images (NOUVEAU !) :
- Sélectionnez plusieurs images directement
- Tri automatique avec credits à la fin

### 🎮 Contrôles Avancés

**Barre supérieure :**
- 📏 **Espacement** : Ajustez l'espace entre les pages (0-50px)
- 🔍 **Taille d'image** : Changez la taille des pages (50-150%)
- 🎨 **Sélecteur de thème**
- 🖥️ **Mode plein écran**
- ⚙️ **Paramètres**

**Raccourcis clavier :**
- `Ctrl +` ou `Ctrl =` : Augmenter la taille des images (sans déplacer la page)
- `Ctrl -` : Réduire la taille des images (sans déplacer la page)

**Boutons additionnels :**
- 🔄 **Importer à nouveau** : Réinitialise l'application pour importer un autre manga (masqué en plein écran)

### 🧭 Navigation Intelligente

- **Navigation dynamique** selon la structure détectée
- **Boutons en bas de page** :
  - ⬅️ Chapitre précédent
  - ⬆️ Remonter en haut
  - ➡️ Chapitre suivant
- **Bouton flottant** de retour en haut (apparaît après 300px de scroll, caché en plein écran)
- **Passage automatique** au tome/type suivant en fin de chapitre
- **Modals de sélection** pour naviguer rapidement

### 🔄 Tri Automatique
- Tri naturel des fichiers (1, 2, 10 au lieu de 1, 10, 2)
- Pages "credits" ou "credi" toujours placées en dernier

### 🎬 Mode Plein Écran Amélioré
- **Animation douce** : La barre de navigation glisse vers le haut en 0.6s
- **Interface épurée** : Boutons de navigation masqués automatiquement
- **Confort optimal** : Aucune distraction, focus total sur la lecture
- **Retour fluide** : Animation inversée au retour en mode normal

## 📥 Installation

### Prérequis
- [Node.js](https://nodejs.org/) (version 14 ou supérieure)
- npm (inclus avec Node.js)

### Étapes d'installation

1. **Cloner le dépôt** :
```bash
git clone https://github.com/Altarex24/Altarex24.git
cd Altarex24
git checkout claude/windows-office-app-011CULRDeozaRVruXcGHNK5L
```

2. **Installer les dépendances** :
```bash
npm install
```

3. **Lancer l'application** :
```bash
npm start
```

### 🖱️ Créer un raccourci sur le bureau

**Méthode rapide :**
1. Double-cliquez sur `create-shortcut.bat`
2. Un raccourci "Manga Reader" sera créé sur votre bureau
3. Lancez l'application en 1 clic !

Vous pouvez aussi lancer directement avec `start.bat` depuis le dossier du projet.

> 💡 **Astuce** : Consultez [INSTALLATION.txt](INSTALLATION.txt) pour un guide détaillé et [RACCOURCI.txt](RACCOURCI.txt) pour créer un raccourci.

## 🚀 Utilisation

### Importer un manga

1. **Lancer l'application** avec `npm start`
2. **Choisir le mode d'importation** :
   - 📁 **Importer un dossier** : Pour une structure complète de manga
   - 🖼️ **Importer des images** : Pour sélectionner des images individuelles
3. Sélectionnez votre manga
4. L'application analyse automatiquement et affiche les pages !

### Lire un manga

- **Scroller** pour lire (lecture verticale)
- **Cliquer sur les boutons** en haut pour changer de tome/type/chapitre
- **Utiliser les boutons** en bas de la dernière page pour naviguer
- **Ajuster la taille** avec Ctrl+/- ou le slider
- **Changer le thème** selon votre préférence

### Personnaliser l'affichage

- **Espacement** : 0-50px entre les pages
- **Taille** : 50-150% de la largeur
- **Thème** : 5 thèmes au choix
- **Plein écran** : Pour une immersion totale

## 📂 Structure du Projet

```
Altarex24/
├── assets/
│   └── logo.svg          # Logo de l'application
├── main.js               # Point d'entrée Electron
├── index.html            # Interface HTML
├── styles.css            # Styles et thèmes
├── app.js                # Logique JavaScript
├── package.json          # Configuration npm
├── INSTALLATION.txt      # Guide d'installation détaillé
└── README.md             # Documentation
```

## 🛠️ Développement

### Activer les DevTools
Décommentez cette ligne dans `main.js` :
```javascript
mainWindow.webContents.openDevTools();
```

### Technologies Utilisées

- **Electron** : Framework pour applications desktop
- **JavaScript ES6+** : Logique de l'application
- **CSS3** : Styles modernes avec variables CSS et animations
- **Node.js** : Système de fichiers et analyse de structure

## 🎯 Fonctionnalités Clés

✅ Détection automatique de la structure
✅ 5 solutions d'importation différentes
✅ Tri naturel avec credits à la fin
✅ Navigation intelligente entre chapitres/tomes/types
✅ Raccourcis clavier Ctrl+/- (sans déplacement de page)
✅ 5 thèmes magnifiques
✅ Ajustement de la taille et de l'espacement
✅ Bouton de retour en haut flottant
✅ Mode plein écran avec animation fluide
✅ Lecture verticale fluide
✅ Ombres stylées autour des pages (sauf thème Nuit)
✅ Bouton "Importer à nouveau" pour changer de manga
✅ Positionnement optimisé des images
✅ Raccourci bureau en 1 clic

## 📝 Notes

- **Formats d'images supportés** : JPG, JPEG, PNG, GIF, BMP, WEBP
- **Lecture optimisée** : Les images sont chargées efficacement
- **Scroll intelligent** : Position toujours réinitialisée en haut lors du changement de chapitre

## 🔮 Améliorations Futures

- [ ] Système de favoris
- [ ] Historique de lecture
- [ ] Marque-pages
- [ ] Mode de lecture horizontal
- [ ] Zoom avec la molette
- [ ] Recherche dans la bibliothèque
- [ ] Import de fichiers CBZ/CBR

## 📄 Licence

MIT - Libre d'utilisation et de modification

---

**Développé avec ❤️ et Claude Code**
