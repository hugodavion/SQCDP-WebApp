# SQCDP WebApp

Application web de tableau de bord SQCDP (Sécurité, Qualité, Coût, Délai, Personnel) avec authentification Supabase.

## 🚀 Démo en ligne
[Voir la démo](https://votre-username.github.io/SQCDP-WebApp/)

## ✨ Fonctionnalités

- 📊 Tableau de bord SQCDP interactif
- 🔐 Authentification sécurisée via Supabase
- 📱 Interface responsive
- 🎯 Module roulette intégré
- 💾 Sauvegarde automatique des données
- 📈 Visualisation graphique des indicateurs

## 🛠️ Installation et Configuration

### Prérequis
- Un compte [Supabase](https://supabase.com/)
- Un navigateur web moderne

### Configuration

1. **Clonez le repository**
   ```bash
   git clone https://github.com/votre-username/SQCDP-WebApp.git
   cd SQCDP-WebApp
   ```

2. **Configuration Supabase**
   
   a. Créez un projet sur [Supabase](https://supabase.com/)
   
   b. Copiez le fichier `js/config.env.js` et remplacez les valeurs :
   ```javascript
   const ENV_CONFIG = {
     SUPABASE_URL: 'https://votre-projet.supabase.co',
     SUPABASE_KEY: 'votre-clé-anon-publique'
   };
   ```

3. **Structure de base de données**
   
   Créez les tables suivantes dans Supabase :
   ```sql
   -- Table pour les données SQCDP
   CREATE TABLE sqcdp_data (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     date DATE,
     axe VARCHAR(1),
     etat VARCHAR(10),
     commentaire TEXT,
     actions JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Politique de sécurité (RLS)
   ALTER TABLE sqcdp_data ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can access their own data" ON sqcdp_data
     FOR ALL USING (auth.uid() = user_id);
   ```

## 📦 Déploiement avec GitHub Pages

1. **Push vers GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Activer GitHub Pages**
   - Allez dans Settings > Pages de votre repository
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Cliquez sur Save

3. **Configuration finale**
   - Votre site sera disponible à : `https://votre-username.github.io/SQCDP-WebApp/`
   - Ajoutez cette URL dans les redirections autorisées de Supabase

## 🔒 Sécurité

⚠️ **Important** : 
- Le fichier `js/config.env.js` contient vos clés Supabase
- Il est exclu du repository via `.gitignore`
- Vous devez le configurer manuellement après le clonage
- N'utilisez que la clé publique "anon" de Supabase (jamais la clé service)

## 🎯 Utilisation

1. Ouvrez l'application dans votre navigateur
2. Connectez-vous avec vos identifiants Supabase
3. Utilisez l'interface pour saisir vos données SQCDP
4. Consultez les tableaux de bord et rapports

## 📁 Structure du projet

```
SQCDP-WebApp/
├── index.html              # Page principale
├── roulette.html           # Module roulette
├── style.css              # Styles CSS
├── js/
│   ├── app-main.js        # Application principale
│   ├── auth.js            # Authentification
│   ├── config.js          # Configuration globale
│   ├── config.env.js      # Variables d'environnement (ignoré)
│   ├── data-manager.js    # Gestion des données
│   ├── ui-manager.js      # Interface utilisateur
│   ├── canvas-renderer-fixed.js # Rendu graphique
│   └── utils.js           # Utilitaires
└── README.md
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez la configuration Supabase
2. Consultez la console développeur du navigateur
3. Ouvrez une issue sur GitHub

---

Développé avec ❤️ pour la gestion SQCDP
