# Compteur de visiteurs


## A propos du projet
Projet inspiré par le projet compteur social développé au FacLab Numixs de Sarcelles en Python.

Le but du projet est de permettre de compter le nombre de visiteurs quotidiens aux FacLab de Sarcelles (Val-d'Oise) et Gennevilliers (Hauts-de-Seine) et de faire signer la charte du FabLab aux utilisateurs qui souhaitent utiliser les machines des locaux.

## Pré-requis

- nodejs > 22.X.X

## Installation
- Cloner le projet : `git clone https://github.com/DanYellow/compteur-de-visiteurs.git`
  - Il est aussi possible de télécharger le zip
- Installer les dépendances : `npm install` dans le dossier du projet
- Copier et renommer le fichier ".env.dist" en ".env.local"
    > Note : Pensez à définir toutes les variables sinon des comportements inattendus peuvent survenir
- Remplir les valeurs vides du fichier ".env.local"

## Utilisation
**Développement**
- Lancer le serveur : `npm run dev`
- Si nécessaire. Lancer les migrations : `npx sequelize-cli db:migrate`
- Ouvrir le lien: http://localhost:3900/ (ou le port que vous aurez défini via la variable d'environnement `PORT`)

### Docker

```bash
  docker compose -f docker-compose.dev.yml --env-file .env.local up
```

**Production**
- Compiler les ressources : `npm run build`
- Lancer le serveur de production : `npm run prod`
- Lister les adresses ip autorisées à enregistrer des visites dans le fichier `whitelist-ip.txt`
  - Ceci permet d'éviter qu'une personne externe au lieu puisse s'enregistrer et donc fausser les données

### Docker

```bash
  docker compose -f docker-compose.yml --env-file .env.local up
```

## Construit avec
- tailwindcss
- zod
- nunjucks
- expressjs
- typescript
- mailpit **Pour la gestion des e-mails en mode développement**

## Gestion des emails
1. Générer le CSS des emails avec la commande `npm run email`
> Note : Tous les gabarits d'emails sont accessibles à l'adresse : [http://127.0.0.1:3900/email/](http://127.0.0.1:3900/email/) - **Développement uniquement**

## Licence

Projet distribué sous licence MIT. Voir fichier LICENCE pour plus d'informations.
