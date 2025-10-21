# Manga Reader - Application Windows

Application de bureau stylée pour gérer et lire vos mangas sur Windows.

## Fonctionnalités

### Interface Principale
- **Design moderne** : Interface avec fond gris foncé élégant
- **Bouton d'importation stylé** : Zone centrale avec effet de survol et animation
- **4 thèmes disponibles** :
  - 🌑 Sombre (par défaut)
  - ☀️ Lumineux
  - 🌲 Forêt
  - 🌙 Nuit (complètement noir)

### Barre de Navigation
- **Navigation** : Tomes, Type, Chapitres
- **Contrôles** :
  - 📏 Espacement entre les pages (slider)
  - 🎨 Sélecteur de thème
  - 🖥️ Mode plein écran
  - ⚙️ Paramètres

### Importation
- Support des formats : CBZ, CBR, ZIP, RAR, PDF
- Système de notification élégant
- Animation lors de l'importation

## Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer l'application :
```bash
npm start
```

## Utilisation

1. **Lancer l'application** avec `npm start`
2. **Importer un manga** : Cliquez sur le grand bouton "+" au centre
3. **Changer le thème** : Utilisez le sélecteur dans la barre supérieure droite
4. **Ajuster l'espacement** : Utilisez le slider pour modifier l'espace entre les éléments
5. **Passer en plein écran** : Cliquez sur le bouton 🖥️

## Structure du Projet

```
manga-reader/
├── main.js           # Point d'entrée Electron
├── index.html        # Interface HTML
├── styles.css        # Styles et thèmes
├── app.js            # Logique JavaScript
├── package.json      # Configuration npm
└── README.md         # Documentation
```

## Développement

### Activer les DevTools
Décommentez la ligne suivante dans `main.js` :
```javascript
// mainWindow.webContents.openDevTools();
```

## Prochaines Étapes

- Implémenter la lecture de manga
- Ajouter la gestion des chapitres
- Créer un système de favoris
- Ajouter plus de paramètres personnalisables
- Implémenter la recherche et les filtres

## Technologies Utilisées

- **Electron** : Framework pour applications desktop
- **JavaScript** : Logique de l'application
- **CSS3** : Styles modernes avec animations
- **Node.js** : Runtime JavaScript

## Licence

MIT
