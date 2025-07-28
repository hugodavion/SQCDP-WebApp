// SQCDP WebApp - Initialisation principale
class SQCDPApp {
  constructor() {
    this.isInitialized = false;
    this.modules = {};
  }

  // Initialisation principale de l'application
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Initialiser les références des modules
      this.modules = {
        dataManager: typeof dataManager !== 'undefined' ? dataManager : null,
        uiManager: typeof uiManager !== 'undefined' ? uiManager : null,
        canvasRenderer: typeof canvasRenderer !== 'undefined' ? canvasRenderer : null,
        eventManager: typeof eventManager !== 'undefined' ? eventManager : null
      };
      
      // Initialiser les modules dans l'ordre
      await this.initModules();
      
      // Configuration globale
      this.setupGlobalErrorHandling();
      
      this.isInitialized = true;
    } catch (error) {
      alert('Erreur lors de l\'initialisation: ' + error.message);
    }
  }

  // Initialiser les modules dans l'ordre approprié
  async initModules() {
    // 1. Nettoyer les anciens event listeners si le module existe
    if (this.modules.eventManager && this.modules.eventManager.cleanup) {
      this.modules.eventManager.cleanup();
    }
    
    // 2. Initialiser UI Manager si disponible
    if (this.modules.uiManager && this.modules.uiManager.init) {
      this.modules.uiManager.init();
    }
    
    // 3. Ajouter les event listeners globaux
    this.setupGlobalEventListeners();
  }

  // Configuration des event listeners globaux
  setupGlobalEventListeners() {
    // Gestion des erreurs de script
    window.addEventListener('error', (e) => {});
    
    // Nettoyage à la fermeture de la page
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Détection des changements de taille d'écran pour le responsive
    const debouncedResize = Utils.debounce(() => {
      if (this.modules.canvasRenderer) {
        this.modules.canvasRenderer.clearCache();
      }
    }, 250);
    
    window.addEventListener('resize', debouncedResize);
  }

  // Gestion d'erreurs globale
  setupGlobalErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
    });
  }
  // Nettoyage à la fermeture
  cleanup() {
    if (this.modules.eventManager) {
      this.modules.eventManager.cleanup();
    }
    if (this.modules.canvasRenderer) {
      this.modules.canvasRenderer.clearCache();
    }
    if (this.modules.dataManager) {
      this.modules.dataManager.clearCache();
    }
  }


  // Obtenir les statistiques de performance
  getPerformanceStats() {
    return {
      modulesLoaded: Object.keys(this.modules).length,
      cacheSize: this.modules.dataManager?.cache?.size || 0,
      canvasCacheSize: this.modules.canvasRenderer?.lastRenderData?.size || 0,
      eventListeners: this.modules.eventManager?.listeners?.size || 0,
      initialized: this.isInitialized
    };
  }
}

// Instance globale de l'application
const sqcdpApp = new SQCDPApp();

// Fonction d'initialisation pour compatibilité
function initSQCDP() {
  sqcdpApp.init();
}

// Auto-initialisation selon l'état du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSQCDP);
} else {
  // DOM déjà prêt, initialiser immédiatement
  initSQCDP();
}

// Export pour compatibilité module (Node.js/CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SQCDPApp, sqcdpApp, initSQCDP };
}

