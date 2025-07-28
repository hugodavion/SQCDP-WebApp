# 🔑 Configuration des Secrets GitHub

## ⚠️ IMPORTANT : Configuration requise pour le déploiement

Votre site GitHub Pages ne fonctionnera pas tant que vous n'aurez pas configuré les secrets suivants.

## 📝 Instructions étape par étape :

### 1. Accéder aux secrets
1. Allez sur : https://github.com/hugodavion/SQCDP-WebApp/settings/secrets/actions
2. Cliquez sur **"New repository secret"**

### 2. Ajouter le premier secret
- **Name** : `SUPABASE_URL`
- **Value** : `https://hinhxyynpbetefknrupz.supabase.co`
- Cliquez sur **"Add secret"**

### 3. Ajouter le deuxième secret
- **Name** : `SUPABASE_KEY`
- **Value** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpbmh4eXlucGJldGVma25ydXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTU3MTEsImV4cCI6MjA2ODk3MTcxMX0.X8MXHtZlcWkJ176D2hHQeoL_JjMz3ajWYWiFMvc1h5s`
- Cliquez sur **"Add secret"**

### 4. Déclencher le déploiement
Une fois les secrets ajoutés, faites un commit/push pour déclencher le déploiement automatique.

## 🔒 Sécurité

✅ **Avantages de cette approche :**
- Les clés ne sont jamais exposées dans le code source
- Elles sont chiffrées par GitHub
- Elles ne sont injectées qu'au moment du build
- Le code source reste propre et sécurisé

❌ **Ce qui était problématique avant :**
- Clés visibles dans le code source
- Risque d'exposition publique
- Mauvaise pratique de sécurité

## 🚀 Après configuration

Une fois les secrets configurés, votre site sera automatiquement déployé à :
**https://hugodavion.github.io/SQCDP-WebApp/**
