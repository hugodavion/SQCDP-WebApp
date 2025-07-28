// Gestionnaire d'événements centralisé
class EventManager {
  constructor() {
    this.listeners = new Map();
    this.delegatedEvents = new Set();
  }

  // Ajouter un event listener avec nettoyage automatique
  addListener(element, event, handler, options = {}) {
    const key = `${element.id || 'unnamed'}-${event}`;
    
    // Supprimer l'ancien listener s'il existe
    if (this.listeners.has(key)) {
      const old = this.listeners.get(key);
      element.removeEventListener(event, old.handler, old.options);
    }
    
    element.addEventListener(event, handler, options);
    this.listeners.set(key, { element, event, handler, options });
    
    return key;
  }

  // Délégation d'événements pour optimiser les performances
  delegate(container, selector, event, handler) {
    const delegateKey = `${container.id}-${event}-${selector}`;
    
    if (this.delegatedEvents.has(delegateKey)) {
      return; // Déjà délégué
    }
    
    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, e);
      }
    };
    
    this.addListener(container, event, delegateHandler);
    this.delegatedEvents.add(delegateKey);
  }

  // Supprimer un listener spécifique
  removeListener(key) {
    if (this.listeners.has(key)) {
      const { element, event, handler, options } = this.listeners.get(key);
      element.removeEventListener(event, handler, options);
      this.listeners.delete(key);
    }
  }

  // Nettoyer tous les listeners
  cleanup() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.listeners.clear();
    this.delegatedEvents.clear();
  }

  // Débounce pour les événements fréquents
  addDebouncedListener(element, event, handler, delay = 100, options = {}) {
    const debouncedHandler = Utils.debounce(handler, delay);
    return this.addListener(element, event, debouncedHandler, options);
  }
}

// Instance globale
const eventManager = new EventManager();

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventManager, eventManager };
}
