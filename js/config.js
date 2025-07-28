// Configuration et constantes globales
const CONFIG = {
  // Configuration Supabase - AUCUNE donnée sensible ici
  SUPABASE: {
    // Méthode pour obtenir la configuration appropriée
    getConfig() {
      const isGitHubPages = window.location.hostname === 'hugodavion.github.io';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isGitHubPages) {
        // Sur GitHub Pages : utilise les variables injectées par GitHub Actions
        if (window.GITHUB_SECRETS && window.GITHUB_SECRETS.SUPABASE_URL && window.GITHUB_SECRETS.SUPABASE_KEY) {
          return {
            url: window.GITHUB_SECRETS.SUPABASE_URL,
            anonKey: window.GITHUB_SECRETS.SUPABASE_KEY
          };
        } else {
          throw new Error('Configuration GitHub Pages non disponible - secrets manquants');
        }
      }
      
      // Pour le développement local seulement
      if (isLocal && window.ENV_CONFIG) {
        return {
          url: window.ENV_CONFIG.SUPABASE_URL,
          anonKey: window.ENV_CONFIG.SUPABASE_KEY
        };
      }
      
      throw new Error('Configuration non disponible pour cet environnement');
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
