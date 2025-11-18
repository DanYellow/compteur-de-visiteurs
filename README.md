# Compteur de visiteurs


## A propos du projet
Projet inspiré par le projet compteur social développé au FabLab Numixs de Sarcelles en Python.

Le but du projet est de permettre de compter le nombre de visiteurs quotidiens aux FacLab de Sarcelles (Val-d'Oise) et Gennevilliers (Hauts-de-Seine) et de faire signer la charte du FabLab aux utilisateurs qui souhaitent utiliser les machines des locaux.

## Pré-requis

- nodejs > 22.X.X

## Installation
- Cloner le projet : `git clone https://github.com/DanYellow/compteur-de-visiteurs.git`
  - Il est aussi possible de télécharger le zip
- Installer les dépendances : `npm install` dans le dossier du projet
- Copier et renommer le fichier ".env.dist" en ".env.local"

## Utilisation
**Développement**
- Lancer le serveur : `npm run dev`
- Ouvrir le lien: http://localhost:3900/ (ou le port que vous aurez défini via la variable d'environnement `VITE_PORT`)

**Production**
- Compiler les ressources : `npm run build`
- Lancer le serveur de production : `npm run prod`


## Construit avec
- tailwindcss
- zod
- nunjucks
- expressjs

## Licence

Projet distribué sous licence MIT. Voir fichier LICENCE pour plus d'informations.
