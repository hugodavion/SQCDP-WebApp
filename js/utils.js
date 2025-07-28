// Utilitaires divers pour l'application SQCDP

// Fonction de sécurité pour échapper les caractères HTML et prévenir les attaques XSS
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Fonction pour échapper les attributs HTML
function escapeAttribute(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Rendre les fonctions globalement accessibles
window.escapeHtml = escapeHtml;
window.escapeAttribute = escapeAttribute;
class Utils {
  // Debounce pour optimiser les performances
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Parser optimisé pour les dates
  static parseDate(dateStr) {
    if (!dateStr) return null;
    
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(dateStr)) {
      const parts = dateStr.split("/");
      return new Date(
        parseInt(parts[2].length === 2 ? "20" + parts[2] : parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Formatage des dates
  static formatDateJJMMAA(dateStr) {
    if (!dateStr || dateStr === 'undefined' || dateStr === 'null') return "";
    
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(dateStr)) {
      const parts = dateStr.split("/");
      if (parts[2].length === 4) {
        return `${parts[0]}/${parts[1]}/${parts[2].slice(2)}`;
      }
      return dateStr;
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y.slice(2)}`;
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }
    return "";
  }

  // Gestion des dates françaises
  static getCurrentMonthYearKey() {
    if (window.AppState && AppState.currentDisplayedMonth) {
      return AppState.currentDisplayedMonth;
    }
    
    const now = new Date();
    const options = { timeZone: "Europe/Paris" };
    
    const year = parseInt(now.toLocaleString('fr-FR', {...options, year: 'numeric'}));
    const month = parseInt(now.toLocaleString('fr-FR', {...options, month: 'numeric'}));
    
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  static getTodayIdxFrance() {
    const now = new Date();
    const parisOptions = { timeZone: 'Europe/Paris' };
    
    const year = parseInt(now.toLocaleString('fr-FR', {...parisOptions, year: 'numeric'}));
    const month = parseInt(now.toLocaleString('fr-FR', {...parisOptions, month: 'numeric'})) - 1;
    const day = parseInt(now.toLocaleString('fr-FR', {...parisOptions, day: 'numeric'}));
    
    return day - 1; // 0-based
  }

  static daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  static getMonthLabel(date) {
    const options = { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' };
    return date.toLocaleString('fr-FR', options).replace(/(^\w)/, c => c.toUpperCase());
  }

  // Vérification des jours spéciaux
  static isJourFerie(date, joursFeries) {
    return joursFeries.some(ferie => 
      ferie.getDate() === date.getDate() && 
      ferie.getMonth() === date.getMonth() && 
      ferie.getFullYear() === date.getFullYear()
    );
  }

  static isWeekend(date) {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  // Gestion des labels d'état
  static etatLabel(etat) {
    if (window.AppState && AppState.labels) {
      return AppState.labels[etat] || "Inconnu";
    }
    return etat || "Inconnu";
  }

  // Optimisation des calculs d'axe
  static async processAxisData(vals, axeId) {
    // Récupérer les états des jours depuis la base de données
    let dayStates = [];
    try {
      dayStates = await window.dataManager.loadDayStates(axeId);
    } catch (err) {
      console.error("Erreur lors du chargement des états des jours:", err);
      dayStates = [];
    }
    
    const monthKey = this.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    
    return vals.reduce((acc, day, i) => {
      // Calculer le numéro du jour (1-indexé)
      const jourNum = i + 1;
      
      // Vérifier si un état personnalisé existe pour ce jour
      let etat = day.etat || 'gris';
      
      if (dayStates && Array.isArray(dayStates) && axeId) {
        // Calculer la date du jour pour la comparaison
        const date = new Date(year, month, jourNum);
        const dateStr = date.toISOString().slice(0, 10);
        
        const dayState = dayStates.find(ds => 
          Number(ds.axe_id) === Number(axeId) && 
          ds.date && 
          ds.date.slice(0, 10) === dateStr
        );
        
        // Si un état est trouvé, l'utiliser
        if (dayState && dayState.etat) {
          // Convertir l'état de l'API au format interne (ok -> vert, attention -> jaune, etc.)
          const etatApi = dayState.etat.trim().toLowerCase();
          
          if (etatApi === 'ok') etat = 'vert';
          else if (etatApi === 'attention') etat = 'jaune';
          else if (etatApi === 'blocage') etat = 'rouge';
          else if (etatApi === 'non rempli') etat = 'gris';
        
        }
      }
      
      acc.counts[etat] = (acc.counts[etat] || 0) + 1;
      
      // Collecter les actions
      const dayActions = day.actions || [];
      dayActions.forEach(action => {
        acc.toutesActions.push({ ...action, jour: i + 1 });
      });
      
      return acc;
    }, { 
      counts: { vert: 0, jaune: 0, rouge: 0, gris: 0 }, 
      toutesActions: [] 
    });
  }
}

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils };
}

// Exposer comme variable globale
window.Utils = Utils;
