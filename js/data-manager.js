// Gestionnaire de données avec cache et optimisations
class DataManager {
  // Définition de l'URL de l'API
  constructor() {
    this.cache = new Map();
    // Forcer l'utilisation de l'API Render, même en local
    this.apiBaseUrl = 'https://sqcdp-api.onrender.com';
  }

  // Chargement des couleurs des états avec valeurs par défaut
  async loadColors() {
    if (this.cache.has('couleurs_etats')) {
      return this.cache.get('couleurs_etats');
    }
    
    // Valeurs par défaut pour les couleurs des états
    const defaultColors = [
      { etat: 'ok', couleur: '#53c15e' },        // Vert
      { etat: 'attention', couleur: '#ffe066' },  // Jaune
      { etat: 'blocage', couleur: '#ec5353' },    // Rouge
      { etat: 'non rempli', couleur: '#e0e0e0' }  // Gris
    ];
    
    // Utiliser directement les valeurs par défaut
    this.cache.set('couleurs_etats', defaultColors);
    return defaultColors;
  }

  // Supprimer un commentaire par son id
  async deleteCommentAPI(commentId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/commentaires/${commentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erreur suppression commentaire');
      this.cache.delete('commentaires');
      this.cache.delete('monthlyData');
      return true;
    } catch (err) {
      throw err;
    }
  }

  // Charger tous les commentaires depuis l'API
  async loadCommentaires() {
    if (this.cache.has('commentaires')) {
      return this.cache.get('commentaires');
    }
    try {
      const response = await fetch(`${this.apiBaseUrl}/commentaires`);
      const commentaires = await response.json();
      this.cache.set('commentaires', commentaires);
      return commentaires;
    } catch (err) {
      return [];
    }
  }

  // Ajouter un commentaire via l'API
  async addCommentAPI(comment) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/commentaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      const result = await response.json();
      // Nettoyer tous les caches concernés
      this.cache.delete('monthlyData');
      this.cache.delete('commentaires');
      // Signaler à l'UI qu'un refresh est nécessaire
      window.forceDonutRefresh = true;
      return result;
    } catch (err) {
      throw err;
    }
  }
  
  // Supprimer une action par son id
  async deleteActionAPI(actionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/actions/${actionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erreur suppression action');
      this.cache.delete('monthlyData');
      return true;
    } catch (err) {
      throw err;
    }
  }

  // Sauvegarder une action (création ou édition)
  async saveActionAPI(action) {
    try {
      let url = `${this.apiBaseUrl}/actions`;
      let method = 'POST';
      if (action.id) {
        url = `${this.apiBaseUrl}/actions/${action.id}`;
        method = 'PUT';
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
      const result = await response.json();
      this.cache.delete('monthlyData');
      return result;
    } catch (err) {
      throw err;
    }
  }

  // Ajouter une nouvelle action
  async addActionAPI(action) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
      if (!response.ok) throw new Error('Erreur création action');
      const result = await response.json();
      this.cache.delete('monthlyData');
      return result;
    } catch (err) {
      throw err;
    }
  }

  // Récupérer une action par son ID
  async getActionByIdAPI(actionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/actions/${actionId}`);
      if (!response.ok) throw new Error('Action non trouvée');
      const action = await response.json();
      return action;
    } catch (err) {
      throw err;
    }
  }

  // Chargement des labels des états avec valeurs par défaut
  async loadLabels() {
    if (this.cache.has('libelles_etats')) {
      return this.cache.get('libelles_etats');
    }
    
    // Valeurs par défaut pour les libellés des états
    const defaultLabels = [
      { etat: 'ok', libelle: 'OK' },
      { etat: 'attention', libelle: 'Attention' },
      { etat: 'blocage', libelle: 'Blocage' },
      { etat: 'non rempli', libelle: 'Non rempli' }
    ];
    
    // Utiliser directement les valeurs par défaut
    this.cache.set('libelles_etats', defaultLabels);
    return defaultLabels;
  }

  // Chargement des axes depuis la BDD avec valeurs par défaut
  async loadAxes() {
    if (this.cache.has('axes')) {
      return this.cache.get('axes');
    }
    
    // Valeurs par défaut pour les axes SQCDP
    const defaultAxes = [
      { id: 1, key: 'S', label: 'Sécurité' },
      { id: 2, key: 'Q', label: 'Qualité' },
      { id: 3, key: 'C', label: 'Coût' },
      { id: 4, key: 'D', label: 'Délai' },
      { id: 5, key: 'P', label: 'Personnel' }
    ];
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/axes`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const axes = await response.json();
        // Vérifier si on a reçu des données valides
        if (Array.isArray(axes) && axes.length > 0) {
          this.cache.set('axes', axes);
          return axes;
        }
      }
      
      // Si aucune donnée valide n'est reçue, utiliser les valeurs par défaut
      console.log('Utilisation des axes par défaut pour SQCDP');
      this.cache.set('axes', defaultAxes);
      return defaultAxes;
    } catch (err) {
      console.log('Erreur lors du chargement des axes, utilisation des valeurs par défaut', err);
      this.cache.set('axes', defaultAxes);
      return defaultAxes;
    }
  }

  async saveParams(params) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const result = await response.json();
      this.cache.set('params', params);
      return result;
    } catch (err) {
      throw err;
    }
  }

  // Gestion des données mensuelles via API
  async loadData() {
    const cacheKey = 'monthlyData';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    try {
      const response = await fetch(`${this.apiBaseUrl}/actions`);
      const actions = await response.json();
      
      // S'il n'y a pas de données d'actions, renvoyer un objet vide
      if (!actions || !Array.isArray(actions)) {
        console.log('Aucune action trouvée ou réponse invalide');
        this.cache.set(cacheKey, {});
        return {};
      }
      
      // Regroupement par mois (clé: yyyy-mm)
      const data = {};
      actions.forEach(action => {
        if (!action.echeance) return;
        const date = new Date(action.echeance);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        if (!data[monthKey]) data[monthKey] = { actions: [] };
        data[monthKey].actions.push(action);
      });
      
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error('Erreur lors du chargement des actions:', err);
      // En cas d'erreur, retourner un objet vide mais valide
      this.cache.set(cacheKey, {});
      return {};
    }
  }

  // Retourne un tableau des jours fériés en France pour une année donnée
  getJoursFeriesFrance(year) {
    // Jours fériés fixes
    const holidays = [
      new Date(year, 0, 1),    // Jour de l'an
      new Date(year, 4, 1),    // Fête du travail
      new Date(year, 4, 8),    // Victoire 1945
      new Date(year, 6, 14),   // Fête nationale
      new Date(year, 7, 15),   // Assomption
      new Date(year, 10, 1),   // Toussaint
      new Date(year, 10, 11),  // Armistice
      new Date(year, 11, 25)   // Noël
    ];
    // Jours fériés mobiles (Pâques, Ascension, Pentecôte)
    const easter = this.calculateEaster(year);
    // Lundi de Pâques
    const easterMonday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1);
    // Ascension (39 jours après Pâques)
    const ascension = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 39);
    // Pentecôte (49 jours après Pâques)
    const pentecost = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 49);
    // Lundi de Pentecôte (50 jours après Pâques)
    const pentecostMonday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 50);
    holidays.push(easterMonday, ascension, pentecost, pentecostMonday);
    return holidays;
  }

  calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  // Sauvegarder l'état d'un jour pour un axe spécifique
  async saveDayStateAPI(dayState) {
    try {
      // Préparer les données pour l'API
      const { jour, axe_id, etat } = dayState;
      
      // Envoyer la requête à l'API
      let url = `${this.apiBaseUrl}/jour_etats`;
      let method = 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jour, axe_id, etat })
      });
      
      const result = await response.json();
      
      // Nettoyer TOUS les caches concernés pour garantir un rechargement complet
      this.cache.delete('monthlyData');
      this.cache.delete('jour_etats');
      
      // Supprimer également les caches spécifiques à cet axe
      if (axe_id) {
        this.cache.delete(`jour_etats_${axe_id}`);
      }
      
      // Forcer le rafraîchissement du donut
      window.forceDonutRefresh = true;
      
      // Mettre à jour le cache directement avec la nouvelle valeur pour accélérer l'affichage
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const date = new Date(year, month, jour);
      const formattedDate = date.toISOString().slice(0, 10);
      
      // Si on a déjà chargé les états des jours, mettre à jour le cache directement
      if (this.cache.has('jour_etats')) {
        const cachedStates = this.cache.get('jour_etats');
        const existingIndex = cachedStates.findIndex(
          ds => Number(ds.axe_id) === Number(axe_id) && 
               ds.date && ds.date.slice(0, 10) === formattedDate
        );
        
        if (existingIndex >= 0) {
          cachedStates[existingIndex].etat = etat;
        } else {
          cachedStates.push({ 
            axe_id: Number(axe_id), 
            date: formattedDate, 
            etat 
          });
        }
      }
      
      return result;
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'état du jour:", err);
      throw err;
    }
  }

  // Charger les états des jours depuis l'API
  async loadDayStates(axeId = null) {
    const cacheKey = axeId ? `jour_etats_${axeId}` : 'jour_etats';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/jour_etats`);
      
      if (response.ok) {
        let dayStates = await response.json();
        
        // Vérifier si on a reçu des données valides
        if (Array.isArray(dayStates)) {
          // Si un axeId est fourni, filtrer les états pour cet axe spécifique
          if (axeId) {
            dayStates = dayStates.filter(ds => Number(ds.axe_id) === Number(axeId));
          }
          
          this.cache.set(cacheKey, dayStates);
          return dayStates;
        }
      }
      
      // Si aucune donnée valide n'est reçue, retourner un tableau vide
      console.log('Aucun état de jour disponible');
      this.cache.set(cacheKey, []);
      return [];
    } catch (err) {
      console.log('Erreur lors du chargement des états des jours', err);
      this.cache.set(cacheKey, []);
      return [];
    }
  }
  
  // Nettoyage du cache
  clearCache() {
    this.cache.clear();
  }
}

var dataManager = new DataManager();
window.dataManager = dataManager;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataManager, dataManager };
}
