// Configuration et constantes globales
const CONFIG = {
  // Configuration Supabase - PUBLIQUE seulement
  SUPABASE: {
    // Configuration pour GitHub Pages (production)
    PRODUCTION: {
      url: 'https://hinhxyynpbetefknrupz.supabase.co',
      // Clé publique uniquement - pas de secret
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpbmh4eXlucGJldGVma25ydXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MDY2NjEsImV4cCI6MjA1MzQ4MjY2MX0.8rWHyNcmhzqaYzUCGhB9YE8U9jUdFwGg9jVKyOmE5NA'
    },
    
    // Méthode pour obtenir la configuration appropriée
    getConfig() {
      const isGitHubPages = window.location.hostname === 'hugodavion.github.io';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isGitHubPages) {
        return this.PRODUCTION;
      }
      
      // Pour le développement local, on essaie de charger config.env.js
      if (isLocal && window.ENV_CONFIG) {
        return {
          url: window.ENV_CONFIG.SUPABASE_URL,
          anonKey: window.ENV_CONFIG.SUPABASE_KEY
        };
      }
      
      // Fallback vers la configuration de production
      return this.PRODUCTION;
    }
  },

  // Paramètres par défaut
  DEFAULT_AXES: [
    { key: "S", label: "Sécurité" },
    { key: "Q", label: "Qualité" },
    { key: "C", label: "Coût" },
    { key: "D", label: "Délai" },
    { key: "P", label: "Personnel" }
  ],

  DEFAULT_COLORS: {
    vert: "#53c15e",
    jaune: "#ffe066",
    rouge: "#ec5353"
  },

  DEFAULT_LABELS: {
    vert: "OK",
    jaune: "Attention",
    rouge: "Blocage",
    gris: "Non rempli"
  },

  // Paramètres de performance
  DEBOUNCE_DELAY: 100,
  CANVAS_SIZE: 440,
  MAX_CACHE_SIZE: 50
};

// Variables globales d'état
const AppState = {
  axes: null,
  colors: null,
  labels: null,
  currentDisplayedMonth: null,
  currentAxeKey: null,
  cache: new Map()
};

// Make sure CONFIG and AppState are globally accessible
window.CONFIG = CONFIG;
window.AppState = AppState;

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, AppState };
}
