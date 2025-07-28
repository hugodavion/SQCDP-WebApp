// Configuration et constantes globales
const CONFIG = {
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
