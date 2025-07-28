// Mode de log : true = dev, false = prod
const IS_DEV = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.ENV === 'dev') || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');

function logDebug(...args) {
  if (IS_DEV) {
    console.debug('[SQCDP]', ...args);
  }
}
function logInfo(...args) {
  if (IS_DEV) {
    console.info('[SQCDP]', ...args);
  }
}
function logWarn(...args) {
  if (IS_DEV) {
    console.warn('[SQCDP]', ...args);
  }
}
function logError(...args) {
  if (IS_DEV) {
    console.error('[SQCDP]', ...args);
  }
}
// État global de l'application (doit être accessible partout)
// Utiliser window.AppState défini dans config.js

// Fonction utilitaire pour le mapping des états API
function etatApiToKey(etat) {
  switch (etat.trim().toLowerCase()) {
    case 'ok': return 'vert';
    case 'attention': return 'jaune';
    case 'blocage': return 'rouge';
    case 'non rempli': return 'gris';
    default: return 'gris';
  }
}
// Gestionnaire d'interface utilisateur
class UIManager {
  // Supprimer une action (API)
  async deleteAction(actionId) {
    if (!actionId) return;
    if (!confirm('Supprimer cette action ?')) return;
    try {
      await window.dataManager.deleteActionAPI(actionId);
      if (this.caseDialog && this.caseDialog.open) {
        const monthKey = Utils.getCurrentMonthYearKey();
        const allData = await window.dataManager.loadData();
        const data = allData[monthKey] || { axes: {}, actions: [] };
        this.showCaseDialog(this.caseAxeKey, this.caseDayIdx, this.caseVal, data);
        this.debouncedRender();
      } else {
        this.debouncedRender();
      }
    } catch (err) {
      logError('Erreur lors de la suppression de l\'action.', err);
      alert('Erreur lors de la suppression de l\'action.');
    }
  }

  // Supprimer un commentaire (API)
  async deleteComment(commentId) {
    if (!commentId) return;
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await window.dataManager.deleteCommentAPI(commentId);
      window.AppState.commentaires = await window.dataManager.loadCommentaires();
      if (this.caseDialog && this.caseDialog.open) {
        const monthKey = Utils.getCurrentMonthYearKey();
        const allData = await window.dataManager.loadData();
        const data = allData[monthKey] || { axes: {}, actions: [] };
        this.showCaseDialog(this.caseAxeKey, this.caseDayIdx, this.caseVal, data);
      } else {
        this.debouncedRender();
      }
    } catch (err) {
      logError('Erreur lors de la suppression du commentaire.', err);
      alert('Erreur lors de la suppression du commentaire.');
    }
  }
  constructor() {
    this.debouncedRender = Utils.debounce(this.renderDashboard.bind(this), window.CONFIG ? CONFIG.DEBOUNCE_DELAY : 100);
    this.caseDialog = null;
    this.caseAxeKey = null;
    this.caseDayIdx = null;
    this.caseVal = null;
  }

  // Initialisation de l'interface
  init() {
    this.initMonthSelector();
    this.initEventListeners();
    this.initDialogEventListeners();
    this.loadAndApplyParams();
    this.renderDashboard();
  }

  // Charger et appliquer les paramètres depuis l'API
  async loadAndApplyParams() {
    // Charger axes
    const axes = await window.dataManager.loadAxes();
    window.AppState.axes = Array.isArray(axes)
      ? axes.filter(axe => axe.key !== 'DCP' && axe.label !== 'DCP')
      : [];

    // Charger couleurs
    const colorsArr = await window.dataManager.loadColors();
    // Les couleurs par défaut sont maintenant gérées dans dataManager.loadColors()
    window.AppState.colors = Array.isArray(colorsArr) && colorsArr.length > 0
      ? colorsArr.reduce((acc, c) => {
          const key = etatApiToKey(c.etat);
          acc[key] = c.couleur || 
            (key === 'vert' ? '#53c15e' : 
             key === 'jaune' ? '#ffe066' : 
             key === 'rouge' ? '#ec5353' : '#e0e0e0');
          return acc;
        }, { vert: '#53c15e', jaune: '#ffe066', rouge: '#ec5353', gris: '#e0e0e0' })
      : { vert: '#53c15e', jaune: '#ffe066', rouge: '#ec5353', gris: '#e0e0e0' };
    this.setColorsVars(AppState.colors);

    // Charger labels
    const labelsArr = await window.dataManager.loadLabels();
    // Les libellés par défaut sont maintenant gérés dans dataManager.loadLabels()
    const defaultLabels = { vert: 'OK', jaune: 'Attention', rouge: 'Blocage', gris: 'Non rempli' };
    window.AppState.labels = Array.isArray(labelsArr) && labelsArr.length > 0
      ? labelsArr.reduce((acc, l) => {
          const key = etatApiToKey(l.etat);
          acc[key] = l.libelle || defaultLabels[key] || key;
          return acc;
        }, {...defaultLabels})
      : defaultLabels;
    this.updateLegendLabels(AppState.labels);

    // Charger les commentaires globaux (pour tous les jours/axes)
    window.AppState.commentaires = await window.dataManager.loadCommentaires();
  }

  // Appliquer les variables CSS des couleurs
  setColorsVars(colors) {
    // S'assurer qu'on utilise des valeurs par défaut si les couleurs ne sont pas définies
    document.documentElement.style.setProperty('--col-vert', colors.vert || '#53c15e');
    document.documentElement.style.setProperty('--col-jaune', colors.jaune || '#ffe066');
    document.documentElement.style.setProperty('--col-rouge', colors.rouge || '#ec5353');
    document.documentElement.style.setProperty('--col-gris', colors.gris || '#e0e0e0');
  }

  // Mettre à jour les labels de légende
  updateLegendLabels(labels) {
    const elements = {
      'legend-vert': labels.vert,
      'legend-jaune': labels.jaune,
      'legend-rouge': labels.rouge,
      'legend-gris': labels.gris
    };
    
    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = text;
    });
  }

  // Initialiser le sélecteur de mois
  initMonthSelector() {
    const monthSelect = document.getElementById('month-select');
    if (!monthSelect) return;
    
    const options = [];
    const today = new Date();
    
    // Générer de -1 an à +3 ans (de -12 mois à +36 mois)
    for (let i = -12; i <= 36; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = Utils.getMonthLabel(date);
      
      options.push({ key, label, isCurrent: i === 0 });
    }
    
    monthSelect.innerHTML = options.map(opt => 
      `<option value="${opt.key}"${opt.isCurrent ? ' selected' : ''}>${opt.label}</option>`
    ).join('');
    
    AppState.currentDisplayedMonth = Utils.getCurrentMonthYearKey();
  }

  // Initialiser les event listeners
  initEventListeners() {
    const monthSelect = document.getElementById('month-select');
    const settingsBtn = document.getElementById('settings-btn');
    
    if (monthSelect) {
      eventManager.addDebouncedListener(monthSelect, 'change', (e) => {
        AppState.currentDisplayedMonth = e.target.value;
        this.debouncedRender();
      });
    }
    
    if (settingsBtn) {
      eventManager.addListener(settingsBtn, 'click', () => {
        this.showParamsDialog();
      });
    }
  }

  // Initialiser les event listeners des dialogs
  initDialogEventListeners() {
    // Dialog case
    const closeCaseBtn = document.getElementById('close-case-dialog');
    if (closeCaseBtn) {
      closeCaseBtn.onclick = () => {
        const caseDialog = document.getElementById('case-dialog');
        if (caseDialog) caseDialog.close();
      };
    }

    // Dialog action (déjà géré dans showActionDialog)

    // Dialog saisie
    const fermerDialogBtn = document.getElementById('fermer-dialog');
    if (fermerDialogBtn) {
      fermerDialogBtn.onclick = () => {
        const saisieDialog = document.getElementById('saisie-dialog');
        if (saisieDialog) saisieDialog.close();
      };
    }

    // Dialog mois (sera géré dans showMoisDetails)
  }

  // Rendu principal du dashboard (API)
  async renderDashboard() {
    await this.loadAndApplyParams();
    const container = document.getElementById('sqcdp-container');
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(AppState.axes) || AppState.axes.length === 0) {
      container.innerHTML = '<p>Aucun axe défini dans les paramètres.</p>';
      return;
    }
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const days = Utils.daysInMonth(year, month);
    const displayedDate = new Date(year, month, 1);
    
    // Charger les données du mois depuis l'API
    const allData = await dataManager.loadData();
    const data = allData[monthKey] || { axes: {}, actions: [] };
    
    // Charger les états des jours
    await window.dataManager.loadDayStates();
    
    // Utiliser for...of pour permettre l'await dans la boucle
    for (const axe of AppState.axes) {
      const vals = this.getAxisValues(data, axe.key, days);
      // Appeler processAxisData de façon asynchrone et passer l'ID de l'axe
      const stats = await Utils.processAxisData(vals, axe.id);
      const actionsEcheanceSemaine = this.getActionsEcheanceSemaine(vals, days);
      // Passe data en argument à createAxisCard
      const card = this.createAxisCard(axe, stats, actionsEcheanceSemaine, displayedDate, days, data);
      container.appendChild(card);
      // Event listeners pour la carte
      this.bindCardEvents(card, axe, vals, data);
    }
    // Rendu des canvas après que tous les éléments soient dans le DOM
    setTimeout(() => {
      this.forceCanvasRender();
    }, 0);
  }

  // Obtenir les valeurs d'un axe
  getAxisValues(data, axeKey, days) {
    const axeData = data.axes?.[axeKey];
    // Récupérer tous les commentaires globaux
    const commentaires = window.AppState && Array.isArray(window.AppState.commentaires) ? window.AppState.commentaires : [];
    // Filtrer les commentaires pour cet axe
    const commentairesAxe = commentaires.filter(c => String(c.axe_id) === String(AppState.axes.find(a => a.key === axeKey)?.id));

    // Générer la date du jour au format yyyy-mm-dd pour chaque index de jour du mois affiché
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    function getDateForDayIdx(idx) {
      const d = new Date(year, month, idx + 1);
      const pad = n => n < 10 ? '0' + n : n;
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    // Charger les états des jours pour cet axe (déjà mis en cache par loadDayStates)
    let dayStates = [];
    const axeMeta = AppState.axes.find(a => a.key === axeKey);
    if (axeMeta && window.dataManager && typeof window.dataManager.loadDayStates === 'function') {
      // On suppose que loadDayStates a déjà été appelé dans renderDashboard
      const cacheKey = `jour_etats_${axeMeta.id}`;
      if (window.dataManager.cache && window.dataManager.cache.has(cacheKey)) {
        dayStates = window.dataManager.cache.get(cacheKey);
      } else if (window.dataManager.cache && window.dataManager.cache.has('jour_etats')) {
        // fallback global
        dayStates = window.dataManager.cache.get('jour_etats').filter(ds => Number(ds.axe_id) === Number(axeMeta.id));
      }
    }

    // Si axeData existe et est un tableau, l'utiliser directement, mais injecter les commentaires et l'état du jour
    if (Array.isArray(axeData)) {
      return axeData.map((val, i) => {
        const dateJour = getDateForDayIdx(i);
        const comms = commentairesAxe.filter(c => c.date === dateJour);
        // Chercher l'état du jour dans dayStates
        const dayState = dayStates.find(ds => ds.date && ds.date.slice(0, 10) === dateJour);
        return { ...val, commentaires: comms, etat: dayState ? etatApiToKey(dayState.etat) : (val.etat || "gris") };
      });
    }

    // Sinon, construire le tableau à partir des données ou valeurs par défaut
    const vals = [];
    for (let i = 0; i < days; i++) {
      let base = axeData && axeData[i] ? { ...axeData[i] } : { etat: "gris", valeur: 0, actions: [], commentaires: [] };
      const dateJour = getDateForDayIdx(i);
      const comms = commentairesAxe.filter(c => c.date === dateJour);
      // Chercher l'état du jour dans dayStates
      const dayState = dayStates.find(ds => ds.date && ds.date.slice(0, 10) === dateJour);
      base.etat = dayState ? etatApiToKey(dayState.etat) : (base.etat || "gris");
      base.commentaires = comms;
      vals.push(base);
    }
    return vals;
  }

  // Calculer les actions à échéance dans la semaine
  getActionsEcheanceSemaine(vals, days) {
    const actionsEcheanceSemaine = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    for (let i = 0; i < days; ++i) {
      const dayActions = vals[i]?.actions || [];
      dayActions.forEach(action => {
        if (action.echeance) {
          const d = Utils.parseDate(action.echeance);
          if (d && d >= today && d <= weekEnd) {
            actionsEcheanceSemaine.push({
              ...action,
              echeanceDate: d
            });
          }
        }
      });
    }
    
    return actionsEcheanceSemaine;
  }

  // Créer une carte d'axe
  createAxisCard(axe, stats, actionsEcheanceSemaine, displayedDate, days, data) {
    // Actions du mois affiché, triées par axe (actions à plat)
    let toutesActionsOuvertes = [];
    // data est passé en argument (dernier paramètre)
    // (supprimé car déjà passé en argument)
    
    if (data && Array.isArray(data.actions)) {
      toutesActionsOuvertes = data.actions.filter(a => {
        const axeIdNum = Number(axe.id);
        const actionAxeIdNum = Number(a.axe_id);
        const matchAxe = !isNaN(axeIdNum) && !isNaN(actionAxeIdNum) && axeIdNum === actionAxeIdNum;
        // Filtrer uniquement les actions dont le statut est 'ouverte'
        const isOuverte = (a.statut || '').toLowerCase() === 'ouverte';
        return matchAxe && isOuverte;
      });
    }
    const card = document.createElement('div');
    card.className = 'sqcdp-card';
    card.id = `card-${axe.key}`; // Ajouter un ID unique pour la carte
    const canvasId = `canvas-${axe.key}`;
    const monthLabel = Utils.getMonthLabel(displayedDate);
    const counts = stats.counts;

    // Actions fermées pour ce mois/axe
    let actionsFermees = [];
    if (data && Array.isArray(data.actions)) {
      actionsFermees = data.actions.filter(a => {
        const axeIdNum = Number(axe.id);
        const actionAxeIdNum = Number(a.axe_id);
        const matchAxe = !isNaN(axeIdNum) && !isNaN(actionAxeIdNum) && axeIdNum === actionAxeIdNum;
        const isFermee = (a.statut || '').toLowerCase() === 'fermee';
        return matchAxe && isFermee;
      });
    }

    card.innerHTML = `
      <div class="header">
        <span>${axe.label}</span>
        <span class="mois">${monthLabel}</span>
        <div class="card-btns">
          <button class="mois-btn" data-axe="${axe.key}" title="Voir le détail du mois">Détails</button>
        </div>
      </div>
      <div class="donut-container">
        <canvas id="${canvasId}" width="440" height="440" tabindex="0" aria-label="Graphique ${axe.label}"></canvas>
        <div class="central-label">${axe.key}</div>
      </div>
      <div class="resume-mois stats-summary">
        <b>${AppState.labels.vert || 'OK'} :</b> ${Number(counts.vert || 0)} &nbsp;| <b>${AppState.labels.jaune || 'Attention'} :</b> ${Number(counts.jaune || 0)} &nbsp;| <b>${AppState.labels.rouge || 'Blocage'} :</b> ${Number(counts.rouge || 0)}
      </div>
      <!-- Liste des actions ouvertes -->
      <div class="actions-ouvertes">
        <div class="actions-ouvertes-header">${toutesActionsOuvertes.length} Action${toutesActionsOuvertes.length > 1 ? 's' : ''} ouverte${toutesActionsOuvertes.length > 1 ? 's' : ''}</div>
        ${toutesActionsOuvertes.length > 0 
          ? `<div class="actions-header">
              <div class="header-nom">Problème</div>
              <div class="header-porteur">Porteur</div>
              <div class="header-creee" style="white-space:nowrap;">Créée</div>
              <div class="header-echeance">Échéance</div>
            </div>`
          : ''
        }
        <div class="actions-ouvertes-list">
          ${toutesActionsOuvertes.length > 0 
            ? toutesActionsOuvertes.map(action => `
                <div class="action-item" onclick="uiManager.showActionDetailsDialog(${action.id})">
                  <div class="action-nom" title="${action.probleme || action.titre || 'Action'}">${(action.probleme || action.titre || 'Action').substring(0, 30)}${(action.probleme || action.titre || 'Action').length > 30 ? '...' : ''}</div>
                  <div class="action-porteur" title="${action.porteur || 'Pas de porteur'}">${(action.porteur || 'Pas de porteur').substring(0, 20)}${(action.porteur || 'Pas de porteur').length > 20 ? '...' : ''}</div>
                  <div class="action-creee">${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}</div>
                  <div class="action-echeance">${action.echeance && action.echeance !== 'undefined' && action.echeance !== 'null' && action.echeance !== '' ? Utils.formatDateJJMMAA(action.echeance) : 'Pas d\'échéance'}</div>
                </div>
              `).join('')
            : '<div class="no-actions">Aucune action ouverte</div>'
          }
        </div>
        <button class="btn-actions-fermees" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block';this.textContent = this.nextElementSibling.style.display === 'block' ? 'Masquer les actions fermées' : 'Voir les actions fermées';">
          Voir les actions fermées
        </button>
        <div class="actions-fermees-list" style="display:none;margin-top:8px;">
          <div class="actions-fermees-header">${actionsFermees.length} Action${actionsFermees.length > 1 ? 's' : ''} fermée${actionsFermees.length > 1 ? 's' : ''}</div>
          <div style="margin-top:4px;">
            <div class="actions-header" style="background:#f7f7f7;border-radius:6px 6px 0 0;">
              <div class="header-nom">Problème</div>
              <div class="header-porteur">Porteur</div>
              <div class="header-creee">Créée</div>
              <div class="header-echeance">Échéance</div>
            </div>
            ${actionsFermees.length > 0 ? actionsFermees.map(action => `
              <div class="action-item" onclick="uiManager.showActionDetailsDialog(${action.id})">
                <div class="action-nom" title="${action.probleme || action.titre || 'Action'}">${(action.probleme || action.titre || 'Action').substring(0, 30)}${(action.probleme || action.titre || 'Action').length > 30 ? '...' : ''}</div>
                <div class="action-porteur" title="${action.porteur || 'Pas de porteur'}">${(action.porteur || 'Pas de porteur').substring(0, 20)}${(action.porteur || 'Pas de porteur').length > 20 ? '...' : ''}</div>
                <div class="action-creee">${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}</div>
                <div class="action-echeance">${action.echeance && action.echeance !== 'undefined' && action.echeance !== 'null' && action.echeance !== '' ? Utils.formatDateJJMMAA(action.echeance) : 'Pas d\'échéance'}</div>
              </div>
            `).join('') : '<div class="no-actions">Aucune action fermée</div>'}
          </div>
        </div>
      </div>
      ${actionsEcheanceSemaine.length > 0
        ? `<div class="actions-ech-semaine" style="margin-top:10px;">
            <b>Actions à échéance &lt; 7j :</b>
            <ul style="padding-left:18px;margin:5px 0 0 0;">
              ${actionsEcheanceSemaine
                .sort((a, b) => a.echeanceDate - b.echeanceDate)
                .map(a =>
                  `<li>
                    <span style="color:#a26c1f;font-weight:600;">${a.echeance && a.echeance !== 'undefined' && a.echeance !== 'null' && a.echeance !== '' ? Utils.formatDateJJMMAA(a.echeance) : 'Pas d\'échéance'}</span>
                    - ${a.probleme || a.titre || 'Action'} (${a.porteur || 'Pas de porteur'})
                    &nbsp;${a.titre || a.code || a.id || ''}
                    ${a.porteur ? `<span style="color:#3A55A4;">(${a.porteur})</span>` : ''}
                  </li>`
                ).join('')}
            </ul>
          </div>`
        : ''}
    `;
    
    return card;
  }

  // Lier les événements d'une carte
  bindCardEvents(card, axe, vals, data) {
    const canvas = card.querySelector('canvas');
    const moisBtn = card.querySelector('.mois-btn');
    const centralLabel = card.querySelector('.central-label');

    // Bouton détails mensuels
    if (moisBtn) {
      eventManager.addListener(moisBtn, 'click', async () => {
        await this.showMoisDetails(axe.key, axe.label, vals);
      });
    }

    // Clic sur la lettre centrale pour ouvrir le jour actuel
    if (centralLabel) {
      eventManager.addListener(centralLabel, 'click', (e) => {
        e.stopPropagation(); // Empêcher la propagation vers le canvas
        
        // Calculer l'index du jour actuel
        const today = new Date();
        const monthKey = Utils.getCurrentMonthYearKey();
        const [yearStr, monthStr] = monthKey.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
        
        // Vérifier si on est dans le bon mois
        if (today.getFullYear() === year && today.getMonth() === month) {
          const currentDayIdx = today.getDate() - 1; // Index 0-based
          
          // Vérifier que le jour actuel est dans la plage des jours du mois
          if (currentDayIdx >= 0 && currentDayIdx < vals.length) {
            this.showCaseDialog(axe.key, currentDayIdx, vals[currentDayIdx], data);
          } else {
            alert('Le jour actuel n\'est pas dans ce mois.');
          }
        } else {
          alert('Vous n\'êtes pas sur le mois actuel. Cliquez sur un jour spécifique du donut.');
        }
      });
      
      // Ajouter un style visuel pour indiquer que c'est cliquable
      centralLabel.style.cursor = 'pointer';
      centralLabel.style.userSelect = 'none';
      centralLabel.title = 'Cliquer pour ouvrir le jour actuel';
    }

    // Événement sur le canvas pour les clics sur les jours
    if (canvas) {
      // S'assurer que l'événement n'est pas attaché plusieurs fois
      canvas.onclick = null;
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const angle = Math.atan2(y, x) + Math.PI / 2;
        const days = vals.length;
        const dayIdx = Math.floor(((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI / days));
        if (dayIdx >= 0 && dayIdx < days) {
          this.showCaseDialog(axe.key, dayIdx, vals[dayIdx], data);
        }
      });
    }
  }

  // Ouvrir le dialog de saisie globale
  openSaisieDialog(axeKey) {
    // TODO: Implémenter le dialog de saisie globale
    alert('Dialog de saisie globale - À implémenter');
  }

  // Afficher le dialog des paramètres
  showParamsDialog() {
    const paramsDialog = document.getElementById('params-dialog');
    if (!paramsDialog) return;

    // S'assurer que les paramètres sont chargés et appliqués
    if (this.loadAndApplyParams instanceof Function) {
      // Si la fonction est async, attendre son exécution
      if (this.loadAndApplyParams.constructor.name === 'AsyncFunction') {
        // eslint-disable-next-line no-await-in-loop
        this.loadAndApplyParams().then(() => this._renderParamsDialog(paramsDialog));
        return;
      }
      this.loadAndApplyParams();
    }
    this._renderParamsDialog(paramsDialog);
  }

  // Nouvelle méthode pour rendre le contenu du dialog après chargement des paramètres
  _renderParamsDialog(paramsDialog) {
    const paramsForm = document.getElementById('params-form');
    const paramsAxesDiv = document.getElementById('params-axes');
    const paramsEtatsDiv = document.getElementById('params-etats');
    const paramsLabelsDiv = document.getElementById('params-labels');

    // Ne rien afficher pour les axes dans les paramètres et retirer le titre
    if (paramsAxesDiv) {
      paramsAxesDiv.innerHTML = '';
      if (paramsAxesDiv.previousElementSibling && paramsAxesDiv.previousElementSibling.tagName === 'B') {
        paramsAxesDiv.previousElementSibling.style.display = 'none';
      }
    }
    // ...existing code...
    
    // Remplir les couleurs
    if (paramsEtatsDiv) {
      paramsEtatsDiv.innerHTML = ["vert", "jaune", "rouge"].map(etat => `
        <div class="params-axe-block">
          <label for="params-etat-${etat}">${Utils.etatLabel(etat)}</label>
          <input type="color" id="params-etat-${etat}" name="etat-${etat}" value="${AppState.colors[etat]}">
        </div>
      `).join('');
    }
    
    // Remplir les labels
    if (paramsLabelsDiv) {
      paramsLabelsDiv.innerHTML = ["vert", "jaune", "rouge", "gris"].map(etat => `
        <div class="params-axe-block">
          <label for="params-label-${etat}">
            <span class="color-indicator" style="background-color: ${etat === "gris" ? "#999" : AppState.colors[etat]}; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 5px;"></span>
            ${Utils.etatLabel(etat)}
          </label>
          <input type="text" id="params-label-${etat}" name="label-${etat}" value="${AppState.labels[etat]}" maxlength="15">
        </div>
      `).join('');
    }

    // Event listeners pour le formulaire
    if (paramsForm) {
      const submitHandler = (e) => {
        e.preventDefault();
        this.saveParamsFromForm(paramsForm);
        paramsDialog.close();
      };
      
      // Supprimer l'ancien listener et ajouter le nouveau
      paramsForm.removeEventListener('submit', submitHandler);
      paramsForm.addEventListener('submit', submitHandler);
    }
    
    // Bouton fermer
    const fermerBtn = document.getElementById('fermer-params');
    if (fermerBtn) {
      fermerBtn.onclick = () => paramsDialog.close();
    }
    
    // Bouton effacer historique
    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm("Êtes-vous sûr de vouloir effacer tout l'historique du mois affiché ?")) {
          const monthKey = Utils.getCurrentMonthYearKey();
          let allData = window.dataManager.loadData();
          delete allData[monthKey];
          window.dataManager.saveData(allData);
          this.renderDashboard();
          paramsDialog.close();
        }
      };
    }
    
    paramsDialog.showModal();
  }

  // Sauvegarder les paramètres depuis le formulaire
  saveParamsFromForm(form) {
    let newAxes = AppState.axes.map(axe => ({
      key: axe.key,
      label: form[`axe-${axe.key}`].value || axe.label
    }));
    
    let newColors = { ...AppState.colors };
    ["vert", "jaune", "rouge"].forEach(etat => {
      newColors[etat] = form[`etat-${etat}`].value || AppState.colors[etat];
    });
    
    let newLabels = { ...AppState.labels };
    ["vert", "jaune", "rouge", "gris"].forEach(etat => {
      newLabels[etat] = form[`label-${etat}`].value || AppState.labels[etat];
    });
    
    window.dataManager.saveParams({ axes: newAxes, colors: newColors, labels: newLabels });
    this.loadAndApplyParams();
    this.renderDashboard();
  }

  // Afficher les détails mensuels
async showMoisDetails(axeKey, axeLabel, vals) {
    const moisDialog = document.getElementById('mois-dialog');
    const moisDetailsAxe = document.getElementById('mois-details-axe');
    const moisDetailsTable = document.getElementById('mois-details-table');
    if (!moisDialog || !moisDetailsAxe || !moisDetailsTable) {
      return;
    }
    moisDetailsAxe.textContent = axeLabel;

    // Synchronisation temps réel : récupérer data du mois courant
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    // Récupérer les actions du mois depuis la BDD (dataManager) - asynchrone
    let allData = await window.dataManager.loadData();
    let data = allData && allData[monthKey] ? allData[monthKey] : { axes: {}, actions: [] };
    // Trouver l'id de l'axe
    const axeMeta = AppState.axes.find(a => a.key === axeKey);
    const axeId = axeMeta ? axeMeta.id : null;

    let tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Jour</th>
            <th>Date</th>
            <th>État</th>
            <th>Actions créées</th>
            <th>Actions à échéance</th>
            <th>Commentaires</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (let idx = 0; idx < vals.length; idx++) {
      const val = vals[idx];
      const currentDate = new Date(year, month, idx + 1);
      const pad = n => n < 10 ? '0' + n : n;
      const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
      let actionsCreation = [];
      let actionsEcheance = [];
      if (data && Array.isArray(data.actions)) {
        actionsCreation = data.actions.filter(a => Number(a.axe_id) === Number(axeId) && a.created_at && a.created_at.slice(0,10) === dateStr);
        actionsEcheance = data.actions.filter(a => Number(a.axe_id) === Number(axeId) && a.echeance && a.echeance.slice(0,10) === dateStr);
      }
      // Commentaires du jour (filtrés par axe et date)
      const commentairesDuJour = (AppState.commentaires || []).filter(c => Number(c.axe_id) === Number(axeId) && c.date === dateStr);
      const commentsCount = commentairesDuJour.length;
      tableHTML += `
        <tr>
          <td>${idx + 1}</td>
          <td>${currentDate.toLocaleDateString('fr-FR')}</td>
          <td>
            <span class="status-indicator status-${val.etat}">
              ${Utils.etatLabel(val.etat)}
            </span>
          </td>
          <td>${actionsCreation.length}</td>
          <td>${actionsEcheance.length}</td>
          <td>${commentsCount}</td>
        </tr>
      `;
    }
    tableHTML += `
        </tbody>
      </table>
    `;
    moisDetailsTable.innerHTML = tableHTML;
    // Ajouter l'event listener pour fermer le dialog
    const closeMoisBtn = document.getElementById('close-mois-details');
    if (closeMoisBtn) {
      closeMoisBtn.onclick = null;
      closeMoisBtn.onclick = () => moisDialog.close();
    }
    moisDialog.showModal();
  }

  // Afficher le dialog d'une case
  async showCaseDialog(axeKey, dayIdx, val, data) {
    const monthKey = Utils.getCurrentMonthYearKey();
    this.caseDialog = document.getElementById('case-dialog');
    if (!this.caseDialog) {
      return;
    }

    this.caseAxeKey = axeKey;
    this.caseDayIdx = dayIdx;
    this.caseVal = val;

    // Correction du calcul de la date du jour (évite le décalage)
    // On récupère le numéro du jour affiché depuis le titre si possible
    // Calcul du jour affiché et de la date filtrée basé uniquement sur dayIdx (0 = 1er jour)
    const jourAffiche = dayIdx + 1;
    const _year = Number(monthKey.split('-')[0]);
    const _month = Number(monthKey.split('-')[1]) - 1;
    const _day = jourAffiche;
    const _currentDate = new Date(_year, _month, _day);
    const _pad = n => n < 10 ? '0' + n : n;
    const _dateStr = `${_currentDate.getFullYear()}-${_pad(_currentDate.getMonth() + 1)}-${_pad(_currentDate.getDate())}`;
    // Mémoriser l'axe et la date courante pour l'ajout de commentaire (après _dateStr)
    const axeMeta = AppState.axes.find(a => a.key === axeKey);
    this.currentAxeId = axeMeta ? axeMeta.id : null;
    this.currentAxe = axeMeta || null;
    this.currentDate = _dateStr;

    const caseHeader = document.getElementById('case-header');
    const caseIndicators = document.getElementById('case-indicators');
    const caseActions = document.getElementById('case-actions');

    if (!caseHeader || !caseIndicators || !caseActions) {
      return;
    }

    // En-tête avec informations du jour
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const currentDate = new Date(year, month, dayIdx + 1);
    // (log supprimé)
    const dateStr = currentDate.toISOString().slice(0,10);
    
    // Récupérer l'id de l'axe
    const axeIdForActions = this.currentAxeId; // Utiliser celui qui a été déjà défini
    
    caseHeader.innerHTML = `
      <h3>Jour ${dayIdx + 1} - ${currentDate.toLocaleDateString('fr-FR')}</h3>
      <p>Axe: <strong>${AppState.axes.find(a => a.key === axeKey)?.label || axeKey}</strong></p>
    `;
    
    // Récupérer l'état actuel du jour s'il existe
    let currentDayState = "non rempli"; // État par défaut
    
    if (this.currentAxeId) {
      const dayStates = await window.dataManager.loadDayStates(this.currentAxeId);
      if (dayStates && Array.isArray(dayStates)) {
        const dayState = dayStates.find(ds => 
          Number(ds.axe_id) === Number(this.currentAxeId) && 
          ds.date && 
          ds.date.slice(0, 10) === _dateStr
        );
        if (dayState) {
          currentDayState = dayState.etat;
        }
      }
    }

    // Indicateurs avec sélecteur d'état
    caseIndicators.innerHTML = `
      <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e9f0;">
        <label for="day-state" style="display: block; margin-bottom: 8px; font-weight: 600; color: #3A55A4;">État du jour:</label>
        <select id="day-state" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100%; background-color: ${
          currentDayState === 'ok' ? '#53c15e' : 
          currentDayState === 'attention' ? '#ffe066' : 
          currentDayState === 'blocage' ? '#ec5353' : 
          '#e0e0e0'
        }; color: ${
          currentDayState === 'attention' ? '#000' : '#fff'
        }; font-weight: 500;">
          <option value="ok" ${currentDayState === 'ok' ? 'selected' : ''} style="background-color: #53c15e; color: white;">OK</option>
          <option value="attention" ${currentDayState === 'attention' ? 'selected' : ''} style="background-color: #ffe066; color: black;">Attention</option>
          <option value="blocage" ${currentDayState === 'blocage' ? 'selected' : ''} style="background-color: #ec5353; color: white;">Blocage</option>
          <option value="non rempli" ${currentDayState === 'non rempli' ? 'selected' : ''} style="background-color: #e0e0e0; color: black;">Non rempli</option>
        </select>
      </div>
    `;

    // Actions du jour pour l'axe affiché (filtrage direct sur data.actions, temps réel)
    let actionsEcheance = [];
    let actionsCreation = [];
    // data est déjà passé en argument à la fonction
    if (data && Array.isArray(data.actions)) {
      // Utiliser this.currentAxeId qui a déjà été défini plus haut
      const axeIdForFiltering = this.currentAxeId;
      const monthKey = Utils.getCurrentMonthYearKey();
      actionsEcheance = data.actions.filter(a => Number(a.axe_id) === Number(axeIdForFiltering) && a.echeance && a.echeance.slice(0,10) === _dateStr && a.echeance.slice(0,7) === monthKey);
      actionsCreation = data.actions.filter(a => Number(a.axe_id) === Number(axeIdForFiltering) && a.created_at && a.created_at.slice(0,10) === _dateStr && a.created_at.slice(0,7) === monthKey);
    }
    // Commentaires du jour (filtrés par axe et date)
    const commentaires = (AppState.commentaires || []).filter(c => Number(c.axe_id) === Number(this.currentAxeId) && c.date && c.date.slice(0, 10) === _dateStr);

    // Génération du HTML pour les commentaires
    let commentairesHTML = '';
    if (commentaires.length) {
      commentairesHTML = `
        <h4>Commentaires:</h4>
        ${commentaires.map((comment) => `
          <div class="case-comment-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div>
              <div class="comment-text">${comment.content}</div>
              <div class="comment-meta">(${comment.date})</div>
            </div>
            <button type="button" class="action-btn supprimer-red" onclick="event.stopPropagation();uiManager.deleteComment(${comment.id})">Supprimer</button>
          </div>
        `).join('')}
      `;
    } else {
      commentairesHTML = '<p>Aucun commentaire pour ce jour</p>';
    }
    caseActions.innerHTML = `
      <style>
        .action-btn.supprimer-red {
          background: #ec5353 !important;
          color: #fff !important;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          padding: 6px 18px;
          cursor: pointer;
          transition: background 0.18s;
        }
        .action-btn.supprimer-red:hover {
          background: #a21d1d !important;
        }
      </style>
      <h4>Actions créées ce jour</h4>
      <div class="actions-du-jour-list">
        ${actionsCreation.length ? actionsCreation.map((action, idx) => `
          <div class="case-action-card">
            <div class="action-label">
              <a href="#" style="color:#1952a2;font-weight:600;text-decoration:underline;cursor:pointer;" onclick="uiManager.showActionDetailsDialog(${action.id});return false;">
                ${action.porteur || action.probleme || 'Action sans nom'}
              </a>
            </div>
            <div class="action-meta">
              Créée le ${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}
              ${action.echeance ? `<br>Échéance: ${Utils.formatDateJJMMAA(action.echeance)}` : ''}
            </div>
            <button type="button" class="action-btn" onclick="uiManager.editAction(${action.id})">Modifier</button>
            <button type="button" class="action-btn supprimer-red" onclick="uiManager.deleteAction(${action.id})">Supprimer</button>
          </div>
        `).join('') : '<div style="color:#888;font-size:0.95em;">Aucune action créée ce jour</div>'}
      </div>
      <h4>Actions à échéance ce jour</h4>
      <div class="actions-du-jour-list">
        ${actionsEcheance.length ? actionsEcheance.map((action, idx) => `
          <div class="case-action-card">
            <div class="action-label">
              <a href="#" style="color:#1952a2;font-weight:600;text-decoration:underline;cursor:pointer;" onclick="uiManager.showActionDetailsDialog(${action.id});return false;">
                ${action.porteur || action.probleme || 'Action sans nom'}
              </a>
            </div>
            <div class="action-meta">
              Créée le ${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}
              ${action.echeance ? `<br>Échéance: ${Utils.formatDateJJMMAA(action.echeance)}` : ''}
            </div>
            <button type="button" class="action-btn" onclick="uiManager.editAction(${action.id})">Modifier</button>
            <button type="button" class="action-btn supprimer-red" onclick="uiManager.deleteAction(${action.id})">Supprimer</button>
          </div>
        `).join('') : '<div style="color:#888;font-size:0.95em;">Aucune action à échéance ce jour</div>'}
      </div>
      
      ${commentairesHTML}
    `;

    // Vérifier si on est sur le jour actuel
    const today = new Date();
    const isCurrentDay = currentDate.toDateString() === today.toDateString();
    
    // Ajouter les boutons d'action (bouton action uniquement pour le jour actuel)
    const dialogActions = this.caseDialog.querySelector('.dialog-actions');
    if (dialogActions) {
      dialogActions.innerHTML = `
        ${isCurrentDay ? '<button type="button" id="add-action-btn">Ajouter une action</button>' : ''}
        <button type="button" id="add-comment-btn">Ajouter un commentaire</button>
        <button type="button" id="close-case-dialog">Fermer</button>
      `;

      // Event listeners pour les boutons
      if (isCurrentDay) {
        document.getElementById('add-action-btn')?.addEventListener('click', () => this.addAction());
      }
      document.getElementById('add-comment-btn')?.addEventListener('click', () => this.addComment());
      document.getElementById('close-case-dialog')?.addEventListener('click', () => this.caseDialog.close());
      
      // Event listener pour le changement d'état du jour
      const dayStateSelect = document.getElementById('day-state');
      if (dayStateSelect) {
        // Mise à jour visuelle immédiate du sélecteur lorsqu'il change
        dayStateSelect.addEventListener('change', function() {
          const newState = this.value;
          // Mettre à jour les couleurs du sélecteur
          this.style.backgroundColor = 
            newState === 'ok' ? '#53c15e' : 
            newState === 'attention' ? '#ffe066' : 
            newState === 'blocage' ? '#ec5353' : 
            '#e0e0e0';
          this.style.color = newState === 'attention' ? '#000' : '#fff';
        });
        
        // Événement pour sauvegarder l'état (méthode séparée)
        dayStateSelect.addEventListener('change', (e) => {
          this.saveDayState(e.target.value);
        });
      }
    }

    this.caseDialog.showModal();
  }

  // Sauvegarder l'état d'un jour (méthode séparée et indépendante)
  async saveDayState(newState) {
    try {
      const payload = {
        axe_id: this.currentAxeId,
        jour: this.caseDayIdx + 1,
        etat: newState
      };
      
      logInfo(`Changement d'état pour le jour ${this.caseDayIdx + 1} (axe ${this.currentAxeId}): ${newState}`);
      
      // Sauvegarder l'état du jour via l'API
      await window.dataManager.saveDayStateAPI(payload);
      
      // Mise à jour immédiate du donut spécifique sans attendre
      await this.updateCanvasAfterStateChange(newState);
      
      // Afficher un message de confirmation discret
      this.showNotification('État du jour enregistré');
      
      // Rafraîchir l'interface complète après un délai
      setTimeout(() => {
        this.debouncedRender();
      }, 1000);
      
    } catch (err) {
      logError("Erreur lors de la sauvegarde de l'état du jour:", err);
      alert("Erreur lors de l'enregistrement de l'état du jour. Veuillez réessayer.");
    }
  }

  // Mettre à jour le canvas après changement d'état
  async updateCanvasAfterStateChange(newState) {
    const axeKey = this.caseAxeKey;
    const canvas = document.getElementById(`canvas-${axeKey}`);
    
    if (canvas && window.canvasRenderer) {
      // Forcer une mise à jour immédiate du canvas spécifique
      await window.canvasRenderer.clearCache();
      
      // Récupérer les données actuelles et mettre à jour
      const monthKey = Utils.getCurrentMonthYearKey();
      const allData = await window.dataManager.loadData();
      const data = allData[monthKey] || { axes: {}, actions: [] };
      const days = Utils.daysInMonth(
        parseInt(monthKey.split("-")[0], 10), 
        parseInt(monthKey.split("-")[1], 10) - 1
      );
      
      // Mettre à jour le canvasRenderer directement
      const vals = this.getAxisValues(data, axeKey, days);
      await window.canvasRenderer.drawDonut(`canvas-${axeKey}`, vals, axeKey, days);
      
      // Mettre également à jour les statistiques
      const axe = window.AppState.axes.find(a => a.key === axeKey);
      if (axe) {
        const stats = await Utils.processAxisData(vals, axe.id);
        const statsSummary = document.querySelector(`#card-${axeKey} .stats-summary`);
        if (statsSummary) {
          statsSummary.innerHTML = `
            <b>${AppState.labels.vert || 'OK'} :</b> ${Number(stats.counts.vert || 0)} &nbsp;| 
            <b>${AppState.labels.jaune || 'Attention'} :</b> ${Number(stats.counts.jaune || 0)} &nbsp;| 
            <b>${AppState.labels.rouge || 'Blocage'} :</b> ${Number(stats.counts.rouge || 0)}
          `;
        }
      }
    }
  }

  // Afficher une notification discrète
  showNotification(message, type = 'success') {
    const notificationDiv = document.createElement('div');
    notificationDiv.textContent = message;
    notificationDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#3A55A4' : '#ec5353'};
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 1000;
      opacity: 0.9;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(notificationDiv);
    
    // Supprimer la notification après 3 secondes
    setTimeout(() => {
      notificationDiv.style.opacity = '0';
      notificationDiv.style.transition = 'opacity 0.5s';
      setTimeout(() => notificationDiv.remove(), 500);
    }, 3000);
  }

  // Ajouter une action
  addAction() {
    this.showActionDialog();
  }

  // Ajouter un commentaire (API)
  async addComment() {
    // Mémoriser le contexte de la case AVANT prompt
    const axeKey = this.caseAxeKey;
    const dayIdx = this.caseDayIdx;
    const val = this.caseVal;
    const axe_id = this.currentAxeId || (this.currentAxe && this.currentAxe.id);
    const date = this.currentDate || (this.currentDay && this.currentDay.date);
    let text = '';
    // Demander le texte du commentaire à l'utilisateur
    text = prompt('Saisir le commentaire à ajouter :');
    if (!text || !text.trim()) return;
    try {
      const payload = {
        axe_id: axe_id !== undefined && axe_id !== null ? Number(axe_id) : undefined,
        date: date,
        content: text
      };
      if (!payload.axe_id || !payload.date || !payload.content) {
        alert('Erreur: Données manquantes pour l\'ajout du commentaire.');
        return;
      }
      await window.dataManager.addCommentAPI(payload);
      // Recharger les commentaires depuis l'API pour affichage immédiat
      window.AppState.commentaires = await window.dataManager.loadCommentaires();
      // Rafraîchir immédiatement le donut concerné
      const monthKey = Utils.getCurrentMonthYearKey();
      const allData = await window.dataManager.loadData();
      const data = allData[monthKey] || { axes: {}, actions: [] };
      const days = Utils.daysInMonth(
        parseInt(monthKey.split("-")[0], 10),
        parseInt(monthKey.split("-")[1], 10) - 1
      );
      const vals = this.getAxisValues(data, axeKey, days);
      if (window.canvasRenderer) {
        await window.canvasRenderer.clearCache();
        await window.canvasRenderer.drawDonut(`canvas-${axeKey}`, vals, axeKey, days);
      }
      // Mettre à jour les stats
      const axe = window.AppState.axes.find(a => a.key === axeKey);
      if (axe) {
        const stats = await Utils.processAxisData(vals, axe.id);
        const statsSummary = document.querySelector(`#card-${axeKey} .stats-summary`);
        if (statsSummary) {
          statsSummary.innerHTML = `
            <b>${AppState.labels.vert || 'OK'} :</b> ${Number(stats.counts.vert || 0)} &nbsp;| 
            <b>${AppState.labels.jaune || 'Attention'} :</b> ${Number(stats.counts.jaune || 0)} &nbsp;| 
            <b>${AppState.labels.rouge || 'Blocage'} :</b> ${Number(stats.counts.rouge || 0)}
          `;
        }
      }
      // Réafficher la modale de case si elle est ouverte
      if (this.caseDialog && this.caseDialog.open) {
        this.showCaseDialog(axeKey, dayIdx, val, data);
      }
      // Forcer le rafraîchissement global du dashboard (donut, stats, etc.)
      this.debouncedRender();
    } catch (err) {
      alert('Erreur lors de l\'ajout du commentaire.');
    }
  }

  // Afficher le dialog d'action
  showActionDialog(action = null, idx = null) {
    const actionDialog = document.getElementById('action-dialog');
    const actionTitle = document.getElementById('action-title');
    const actionFields = document.getElementById('action-fields');
    
    if (!actionDialog || !actionTitle || !actionFields) {
      return;
    }

    this.editActionIdx = idx;
    const isEdit = !!action;
    actionTitle.innerHTML = isEdit ? `Action - ${action.id || action.titre || 'Nouvelle'}` : "Nouvelle action";
    
    // Formulaire complet inspiré de l'original
    actionFields.innerHTML = `
      <div class="form-row">
        <label>Problème</label>
        <input type="text" name="probleme" value="${action?.probleme || ''}" required>
        <div style="display:flex;gap:10px;">
          <div style="flex:1;">
            <label>Catégorie</label>
            <input type="text" name="categorie" value="${action?.categorie || ''}">
          </div>
          <div style="flex:1;">
            <label>Criticité du problème</label>
            <input type="text" name="criticite" value="${action?.criticite || ''}">
          </div>
        </div>
        <label>Cause</label>
        <input type="text" name="cause" value="${action?.cause || ''}">
        <div style="display:flex;gap:10px;">
          <div style="flex:1;">
            <label>Auteur</label>
            <input type="text" name="auteur" value="${action?.auteur || ''}">
          </div>
          <div style="flex:1;">
            <label>Porteur <span style="color:#ec5353">*</span></label>
            <input type="text" name="porteur" value="${action?.porteur || ''}" required>
          </div>
        </div>
        <label>Solution</label>
        <textarea name="solution" rows="4">${action?.solution || ''}</textarea>
        <div style="display:flex;gap:10px;">
          <div style="flex:1;">
            <label>Date d'échéance</label>
            <input type="date" name="echeance" value="${action?.echeance ? this.convertDateForInput(action.echeance) : ''}">
          </div>
          <div style="flex:1;">
            <label>Statut</label>
            <select name="statut">
              <option value="ouverte" ${(!action?.statut || action?.statut === 'ouverte') ? 'selected' : ''}>Ouverte</option>
              <option value="fermee" ${action?.statut === 'fermee' ? 'selected' : ''}>Fermée</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Event listeners pour les boutons
    const saveActionBtn = document.getElementById('save-action-btn');
    const closeActionBtn = document.getElementById('close-action-dialog');
    
    if (saveActionBtn) {
      saveActionBtn.onclick = () => this.saveAction(isEdit);
    }
    
    if (closeActionBtn) {
      closeActionBtn.onclick = () => actionDialog.close();
    }

    actionDialog.showModal();
  }

  // Convertir date pour input HTML
  convertDateForInput(dateStr) {
    if (!dateStr) return '';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    return '';
  }

  // Sauvegarder une action (API)
  async saveAction(isEdit) {
    const actionDialog = document.getElementById('action-dialog');
    const actionFields = document.getElementById('action-fields');
    if (!actionDialog || !actionFields) {
      alert('Erreur: éléments du formulaire non trouvés');
      return;
    }
    
    // Récupérer les valeurs du formulaire
    const form = actionFields.querySelectorAll('input, textarea, select');
    const action = {};
    form.forEach(input => {
      if (input.type === 'date') {
        action[input.name] = input.value ? input.value : null;
      } else {
        action[input.name] = input.value;
      }
    });
    
    // Ajout des champs contextuels
    // Rattacher à l'axe courant et au jour courant
    const axeMeta = AppState.axes.find(a => a.key === this.caseAxeKey);
    if (axeMeta) {
      action.axe_id = axeMeta.id;
    }
    
    // Ajouter la date de création comme étant la date du jour sélectionné
    // (permet de créer des actions pour des jours passés ou futurs)
    if (this.currentDate) {
      action.created_at = this.currentDate;
    }
    
    if (!action.probleme || !action.porteur) {
      alert('Veuillez remplir au minimum les champs "Problème" et "Porteur".');
      return;
    }
    
    try {
      let result;
      if (isEdit && this.editActionIdx !== null) {
        // Modifier action existante
        result = await window.dataManager.saveActionAPI(action);
      } else {
        // Créer nouvelle action
        result = await window.dataManager.addActionAPI(action);
      }
      
      actionDialog.close();
      
      // Rafraîchir l'affichage
      if (this.caseDialog && this.caseDialog.open) {
        // Recharger les données du mois et réafficher la case
        const monthKey = Utils.getCurrentMonthYearKey();
        const allData = await window.dataManager.loadData();
        const data = allData[monthKey] || { axes: {}, actions: [] };
        this.showCaseDialog(this.caseAxeKey, this.caseDayIdx, this.caseVal, data);
      }
      
      // Rafraîchir le dashboard
      this.debouncedRender();
      
      alert(isEdit ? 'Action modifiée avec succès!' : 'Action créée avec succès!');
    } catch (err) {
      logError('Erreur lors de la sauvegarde de l\'action:', err);
      alert('Erreur lors de la sauvegarde de l\'action.');
    }
  }

  // Modifier une action existante
  async editAction(actionId) {
    if (!actionId) return;
    
    try {
      // Récupérer l'action depuis l'API
      const action = await window.dataManager.getActionByIdAPI(actionId);
      if (!action) {
        alert('Action non trouvée');
        return;
      }
      
      // Afficher le dialog d'édition
      this.showActionDialog(action, actionId);
    } catch (err) {
      logError('Erreur lors du chargement de l\'action:', err);
      alert('Erreur lors du chargement de l\'action.');
    }
  }

  // Afficher le détail d'une action (lecture seule)
  async showActionDetailsDialog(actionId) {
    if (!actionId) return;
    
    try {
      const action = await window.dataManager.getActionByIdAPI(actionId);
      if (!action) {
        alert('Action non trouvée');
        return;
      }
      
      // Créer ou récupérer le dialog de détails
      let dialog = document.getElementById('action-details-dialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'action-details-dialog';
        dialog.innerHTML = `
          <style>
            #action-details-dialog {
              max-width: 700px;
              min-width: 480px;
              width: 60vw;
              border: none;
              border-radius: 18px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.18);
              padding: 0;
              background: #fff;
              font-family: 'Segoe UI', Arial, sans-serif;
              animation: fadeInDialog .25s;
            }
            #action-details-content {
              padding: 32px 36px 18px 36px;
              font-size: 1.13em;
              color: #222;
              line-height: 1.7;
            }
            #action-details-dialog h3 {
              margin: 0;
              padding: 24px 36px 0 36px;
              font-size: 1.45em;
              color: #3A55A4;
              font-weight: 700;
              letter-spacing: 0.01em;
            }
            #close-action-details-btn, #edit-action-details-btn, #save-action-details-btn, #delete-action-details-btn {
              min-width: 140px;
              margin: 0;
              padding: 12px 0;
              background: #3A55A4;
              color: #fff;
              border: none;
              border-radius: 8px;
              font-size: 1.08em;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.18s;
              margin-right: 0;
              margin-left: 0;
              display: inline-block;
            }
            #delete-action-details-btn {
              background: #ec5353;
            }
            #delete-action-details-btn:hover {
              background: #a21d1d;
            }
            #close-action-details-btn:hover, #edit-action-details-btn:hover, #save-action-details-btn:hover {
              background: #0d2c5a;
            }
            #action-details-btns {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 32px;
              margin: 38px 0 18px 0;
              width: 100%;
            }
            @keyframes fadeInDialog {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: none; }
            }
          </style>
          <h3>Détail de l'action</h3>
          <div id="action-details-content"></div>
          <div id="action-details-btns">
            <button id="edit-action-details-btn">Modifier</button>
            <button id="delete-action-details-btn">Supprimer</button>
            <button id="close-action-details-btn">Fermer</button>
          </div>
        `;
        document.body.appendChild(dialog);
      }
      
      const btnDelete = dialog.querySelector('#delete-action-details-btn');
      // Suppression action
      btnDelete.onclick = async () => {
        if (!confirm('Supprimer cette action ?')) return;
        try {
          await window.dataManager.deleteActionAPI(action.id);
          dialog.close();
          if (window.uiManager && typeof window.uiManager.debouncedRender === 'function') {
            window.uiManager.debouncedRender();
          }
          alert('Action supprimée.');
        } catch (err) {
          alert('Erreur lors de la suppression de l\'action.');
        }
      };
      
      const content = dialog.querySelector('#action-details-content');
      const btnEdit = dialog.querySelector('#edit-action-details-btn');
      const btnClose = dialog.querySelector('#close-action-details-btn');
      
      // Affichage lecture seule
      function renderReadOnly() {
        content.innerHTML = `
          <div style="display:grid;grid-template-columns:140px 1fr;row-gap:10px;column-gap:0;align-items:center;">
            <div style="font-weight:600;color:#3A55A4;">Problème :</div><div>${action.probleme || action.titre || ''}</div>
            <div style="font-weight:600;">Porteur :</div><div>${action.porteur || ''}</div>
            <div style="font-weight:600;">Créée le :</div><div>${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}</div>
            <div style="font-weight:600;">Échéance :</div><div>${action.echeance ? Utils.formatDateJJMMAA(action.echeance) : ''}</div>
            <div style="font-weight:600;">Statut :</div><div>${action.statut || ''}</div>
            <div style="font-weight:600;">Solution :</div><div>${action.solution || ''}</div>
          </div>
        `;
        btnEdit.style.display = '';
      }
      
      // Affichage édition
      function renderEdit() {
        content.innerHTML = `
          <form id="edit-action-form" style="display:grid;grid-template-columns:140px 1fr;row-gap:14px;column-gap:0;align-items:center;">
            <label style="font-weight:600;color:#3A55A4;">Problème :</label>
            <input type="text" name="probleme" value="${action.probleme || ''}" required style="font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #bbb;">
            <label style="font-weight:600;">Porteur :</label>
            <input type="text" name="porteur" value="${action.porteur || ''}" required style="font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #bbb;">
            <label style="font-weight:600;">Créée le :</label>
            <input type="text" value="${action.created_at ? Utils.formatDateJJMMAA(action.created_at) : ''}" disabled style="background:#f5f5f5;color:#888;font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #eee;">
            <label style="font-weight:600;">Échéance :</label>
            <input type="date" name="echeance" value="${action.echeance ? (action.echeance.length === 10 ? action.echeance : '') : ''}" style="font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #bbb;">
            <label style="font-weight:600;">Statut :</label>
            <select name="statut" style="font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #bbb;">
              <option value="ouverte" ${(!action.statut || action.statut === 'ouverte') ? 'selected' : ''}>Ouverte</option>
              <option value="fermee" ${action.statut === 'fermee' ? 'selected' : ''}>Fermée</option>
            </select>
            <label style="font-weight:600;">Solution :</label>
            <textarea name="solution" rows="2" style="font-size:1em;padding:6px 8px;border-radius:6px;border:1px solid #bbb;">${action.solution || ''}</textarea>
          </form>
        `;
        btnEdit.style.display = 'none';
        // Ajouter bouton enregistrer si pas déjà là
        let btnSave = dialog.querySelector('#save-action-details-btn');
        if (!btnSave) {
          btnSave = document.createElement('button');
          btnSave.id = 'save-action-details-btn';
          btnSave.textContent = 'Enregistrer';
          btnSave.type = 'button';
          btnSave.style.marginRight = '12px';
          btnSave.onclick = saveEdit;
          btnClose.parentNode.insertBefore(btnSave, btnClose);
        }
        btnSave.style.display = '';
      }
      
      // Sauvegarde édition
      const saveEdit = async () => {
        const form = dialog.querySelector('#edit-action-form');
        if (!form) return;
        const formData = new FormData(form);
        const updated = { ...action };
        for (const [key, value] of formData.entries()) {
          updated[key] = value;
        }
        // Format date échéance
        if (updated.echeance && updated.echeance.length === 10) {
          updated.echeance = updated.echeance;
        } else {
          updated.echeance = null;
        }
        try {
          await window.dataManager.saveActionAPI(updated);
          // Mettre à jour l'action locale
          Object.assign(action, updated);
          renderReadOnly();
          // Masquer bouton enregistrer
          let btnSave = dialog.querySelector('#save-action-details-btn');
          if (btnSave) btnSave.style.display = 'none';
          // Rafraîchir dashboard
          if (window.uiManager && typeof window.uiManager.debouncedRender === 'function') {
            window.uiManager.debouncedRender();
          }
          alert('Action modifiée avec succès !');
        } catch (err) {
          alert('Erreur lors de la modification de l\'action.');
        }
      };
      
      // Actions boutons
      btnEdit.onclick = renderEdit;
      btnClose.onclick = () => {
        // Masquer bouton enregistrer si présent
        let btnSave = dialog.querySelector('#save-action-details-btn');
        if (btnSave) btnSave.style.display = 'none';
        dialog.close();
      };
      
      renderReadOnly();
      dialog.showModal();
    } catch (err) {
      logError('Erreur lors du chargement de l\'action:', err);
      alert('Erreur lors du chargement de l\'action.');
    }
  }
  // Forcer le rendu des canvas
  async forceCanvasRender() {
    if (typeof canvasRenderer !== 'undefined') {
      // Nettoyer le cache
      canvasRenderer.clearCache();
      
      // Re-rendre tous les canvas
      const monthKey = Utils.getCurrentMonthYearKey();
      const [yearStr, monthStr] = monthKey.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const days = Utils.daysInMonth(year, month);
      const allData = await dataManager.loadData();
      const data = allData[monthKey] || { axes: {}, actions: {} };
      
      // Charger les états des jours
      await window.dataManager.loadDayStates();

      // Collecter les promesses de rendu
      const drawPromises = [];

      // Dessiner les canvas un par un pour permettre la mise à jour des compteurs
      for (const axe of AppState.axes) {
        // Mettre à jour la clé d'axe actuelle avant de dessiner
        window.AppState.currentAxeKey = axe.key;
        
        const vals = this.getAxisValues(data, axe.key, days);
        // Recalculer les statistiques pour chaque axe avec les états personnalisés
        const stats = await Utils.processAxisData(vals, axe.id);
        
        // Mettre à jour le compteur d'états dans la carte
        const statsSummary = document.querySelector(`#card-${axe.key} .stats-summary`);
        if (statsSummary) {
          statsSummary.innerHTML = `
            <b>${AppState.labels.vert || 'OK'} :</b> ${Number(stats.counts.vert || 0)} &nbsp;| 
            <b>${AppState.labels.jaune || 'Attention'} :</b> ${Number(stats.counts.jaune || 0)} &nbsp;| 
            <b>${AppState.labels.rouge || 'Blocage'} :</b> ${Number(stats.counts.rouge || 0)}
          `;
        }
        
        const canvas = document.getElementById(`canvas-${axe.key}`);
        if (canvas) {
          const drawPromise = canvasRenderer.drawDonut(`canvas-${axe.key}`, vals, axe.key, days);
          drawPromises.push(drawPromise);
        }
      }
      
      await Promise.all(drawPromises);
    }
  }
}

// Instance globale
var uiManager = new UIManager();
// Correction : s'assure que la méthode est bien présente sur l'instance
if (typeof UIManager.prototype.showActionDetailsDialog === 'function' && typeof uiManager.showActionDetailsDialog !== 'function') {
  uiManager.showActionDetailsDialog = UIManager.prototype.showActionDetailsDialog.bind(uiManager);
}
window.uiManager = uiManager;

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager, uiManager };
}
