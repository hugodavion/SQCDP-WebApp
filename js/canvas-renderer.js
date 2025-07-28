// Gestionnaire de rendu Canvas optimisé
class CanvasRenderer {
  constructor() {
    this.canvasCache = new Map();
    this.lastRenderData = new Map();
  }

  // Méthode principale de rendu du donut
  async drawDonut(canvasId, vals, axeKey, days) {
    // Vérifier si on a besoin de redessiner, mais on ignore le cache après une modification d'état
    // pour s'assurer que les changements d'état s'affichent immédiatement
    const dataKey = JSON.stringify({ vals, days });
    const forceRefresh = window.forceDonutRefresh || false;
    if (!forceRefresh && this.lastRenderData.get(canvasId) === dataKey) {
      return; // Pas de changement, éviter le redessinage
    }
    // Réinitialiser le flag de rafraîchissement forcé
    window.forceDonutRefresh = false;

    // Récupérer l'année et le mois
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    
    // Récupérer les jours fériés pour l'année en cours
    const joursFeries = window.dataManager ? window.dataManager.getJoursFeriesFrance(year) : [];

    const colors = { ...AppState.colors, gris: "#e0e0e0" };
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Stocker la clé d'axe dans le canvas comme attribut de données
    canvas.setAttribute('data-axe-key', axeKey);
    
    // Enregistrer également la clé d'axe actuelle dans AppState
    window.AppState.currentAxeKey = axeKey;
    
    // Récupérer l'objet axe correspondant à la clé
    const axe = window.AppState.axes.find(a => a.key === axeKey);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R1 = canvas.width / 2 - 15; // Ajusté pour s'adapter au canvas
    const R2 = R1 * 0.65; // Proportionnel au rayon extérieur
    const angleStep = 2 * Math.PI / days;

    this.drawDayBackgrounds(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries);
    await this.drawStateColors(ctx, cx, cy, R1, R2, angleStep, vals, colors, days);
    this.drawCurrentDayIndicator(ctx, cx, cy, R1, R2, angleStep, days, monthKey);
    this.drawCommentIndicators(ctx, cx, cy, R1, R2, angleStep, vals, days);
    this.drawDayNumbers(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries);
    this.drawCenterCircle(ctx, cx, cy, R2);
    this.drawAxeLetter(ctx, cx, cy, axeKey);

    // Mettre à jour également les statistiques affichées dans la carte
    if (axe) {
      // Recalculer les statistiques avec les états personnalisés
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

    // Mettre en cache les données de rendu
    this.lastRenderData.set(canvasId, dataKey);
  }
  // Dessine la lettre de l'axe (S, Q, C, D, P) au centre du donut
  drawAxeLetter(ctx, cx, cy, axeKey) {
    ctx.save();
    // Ajuster la taille de la police en fonction de la taille du canvas
    const fontSize = Math.min(cx * 1.1, 120);
    ctx.font = `bold ${fontSize}px Segoe UI, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#3A55A4";
    ctx.globalAlpha = 0.92;
    // Décalage vertical léger pour un centrage optique parfait
    ctx.fillText(axeKey, cx, cy + 2);
    ctx.restore();
  }

  drawDayBackgrounds(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries) {
    for (let i = 0; i < days; ++i) {
      const currentDate = new Date(year, month, i + 1);
      const isWeekendDay = Utils.isWeekend(currentDate);
      const isFerie = Utils.isJourFerie(currentDate, joursFeries);
      
      let dayTypeColor;
      if (isFerie) {
        dayTypeColor = "#bbb";
      } else if (isWeekendDay) {
        dayTypeColor = "#d0d0d0";
      } else {
        dayTypeColor = "#f0f0f0";
      }
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, (R1 + R2) / 2, i * angleStep - Math.PI / 2, (i + 1) * angleStep - Math.PI / 2, false);
      ctx.lineWidth = R1 - R2 - 2;
      ctx.strokeStyle = dayTypeColor;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.restore();
    }
  }

  async drawStateColors(ctx, cx, cy, R1, R2, angleStep, vals, colors, days) {
    // Récupérer l'année et le mois
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    
    // Récupérer l'axe courant
    const axeKey = ctx.canvas.getAttribute('data-axe-key');
    const axe = AppState.axes.find(a => a.key === axeKey);
    
    // Récupérer les états des jours si disponibles
    let dayStates = [];
    try {
      if (axe && axe.id) {
        dayStates = await window.dataManager.loadDayStates(axe.id);
        console.log(`États récupérés pour l'axe ${axe.key} (id: ${axe.id}):`, dayStates);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des états des jours:", err);
      dayStates = [];
    }
    
    for (let i = 0; i < days; ++i) {
      // État par défaut
      let etat = vals[i] && vals[i].etat ? vals[i].etat : "gris";
      
      // Calculer la date du jour
      const date = new Date(year, month, i + 1);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Vérifier si un état existe pour ce jour dans dayStates
      if (dayStates && Array.isArray(dayStates) && axe) {
        // Calculer la date du jour pour la comparaison avec correction du décalage de -1 jour
        const adjustedDate = new Date(year, month, i);
        const adjustedDateStr = adjustedDate.toISOString().slice(0, 10);
        
        // Chercher d'abord avec la date ajustée pour corriger le décalage
        let dayState = dayStates.find(ds => 
          Number(ds.axe_id) === Number(axe.id) && 
          ds.date && 
          ds.date.slice(0, 10) === adjustedDateStr
        );
        
        // Si non trouvé, essayer avec la date normale
        if (!dayState) {
          dayState = dayStates.find(ds => 
            Number(ds.axe_id) === Number(axe.id) && 
            ds.date && 
            ds.date.slice(0, 10) === dateStr
          );
        }
        
        // Si un état est trouvé, l'utiliser au lieu de etat
        if (dayState && dayState.etat) {
          // Convertir l'état de l'API au format interne (ok -> vert, attention -> jaune, etc.)
          const etatApi = dayState.etat.trim().toLowerCase();
          let etatInterne = etat;
          
          if (etatApi === 'ok') etatInterne = 'vert';
          else if (etatApi === 'attention') etatInterne = 'jaune';
          else if (etatApi === 'blocage') etatInterne = 'rouge';
          else if (etatApi === 'non rempli') etatInterne = 'gris';
          
          console.log(`Jour ${i+1}: État trouvé dans dayStates: '${dayState.etat}' -> converti en '${etatInterne}' (remplace '${etat}')`);
          etat = etatInterne;
        }
      }
      
      const color = colors[etat] || colors.gris;
      console.log(`Jour ${i+1}: État final utilisé: '${etat}', couleur: '${color}'`);
      
      // Dessiner tous les états, y compris gris
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, (R1 + R2) / 2, i * angleStep - Math.PI / 2, (i + 1) * angleStep - Math.PI / 2, false);
      ctx.lineWidth = R1 - R2 - 6;
      ctx.strokeStyle = color;
      ctx.lineCap = "butt";
      
      // Réduire l'opacité pour l'état gris pour qu'il soit plus subtil
      ctx.globalAlpha = etat === "gris" ? 0.3 : 0.85;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCurrentDayIndicator(ctx, cx, cy, R1, R2, angleStep, days, monthKey) {
    const isCurrentMonth = monthKey === (() => {
      const now = new Date();
      const options = { timeZone: "Europe/Paris" };
      const year = parseInt(now.toLocaleString('fr-FR', {...options, year: 'numeric'}));
      const month = parseInt(now.toLocaleString('fr-FR', {...options, month: 'numeric'}));
      return `${year}-${String(month).padStart(2, "0")}`;
    })();
    
    if (isCurrentMonth) {
      const todayIdx = Utils.getTodayIdxFrance();
      if (todayIdx >= 0 && todayIdx < days) {
        const sectorAngleStart = todayIdx * angleStep - Math.PI / 2;
        const sectorAngleEnd = (todayIdx + 1) * angleStep - Math.PI / 2;
        
        ctx.save();
        
        // Option 1: Arrière-plan bleu semi-transparent dans le secteur
        ctx.beginPath();
        ctx.arc(cx, cy, R1 - 8, sectorAngleStart, sectorAngleEnd, false);
        ctx.lineTo(
          cx + Math.cos(sectorAngleEnd) * (R2 + 8),
          cy + Math.sin(sectorAngleEnd) * (R2 + 8)
        );
        ctx.arc(cx, cy, R2 + 8, sectorAngleEnd, sectorAngleStart, true);
        ctx.closePath();
        
        // Remplissage bleu semi-transparent
        ctx.fillStyle = "rgba(58, 85, 164, 0.15)";
        ctx.fill();
        
        // Option 2: Bordure fine et discrète
        ctx.beginPath();
        ctx.arc(cx, cy, R1 - 5, sectorAngleStart, sectorAngleEnd, false);
        ctx.lineTo(
          cx + Math.cos(sectorAngleEnd) * (R2 + 5),
          cy + Math.sin(sectorAngleEnd) * (R2 + 5)
        );
        ctx.arc(cx, cy, R2 + 5, sectorAngleEnd, sectorAngleStart, true);
        ctx.closePath();
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#3A55A4";
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        
        ctx.restore();
      }
    }
  }

  drawCommentIndicators(ctx, cx, cy, R1, R2, angleStep, vals, days) {
    ctx.save();
    
    // Récupérer l'année et le mois actuels
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    
    // Récupérer l'axe courant
    const axeKey = ctx.canvas.getAttribute('data-axe-key');
    const axe = AppState.axes.find(a => a.key === axeKey);
    
    for (let i = 0; i < days; ++i) {
      let hasComment = false;
      
      // Vérifier d'abord si les commentaires sont dans les vals
      const v = vals[i];
      if (v && Array.isArray(v.commentaires) && v.commentaires.length > 0) {
        hasComment = true;
      } 
      // Vérifier aussi directement dans AppState.commentaires avec correction du décalage
      else if (axe && axe.id && window.AppState.commentaires) {
        // Calculer la date du jour avec correction du décalage de -1 jour
        const adjustedDate = new Date(year, month, i);
        const adjustedDateStr = adjustedDate.toISOString().slice(0, 10);
        
        const commentairesDuJour = window.AppState.commentaires.filter(
          c => Number(c.axe_id) === Number(axe.id) && c.date === adjustedDateStr
        );
        
        if (commentairesDuJour.length > 0) {
          hasComment = true;
          console.log(`Jour ${i+1}: ${commentairesDuJour.length} commentaire(s) trouvé(s) avec date ajustée ${adjustedDateStr}`);
        }
      }
      
      if (hasComment) {
        console.log(`Dessin indicateur de commentaire pour le jour ${i+1}`);
        
        const angle = (i + 0.5) * angleStep - Math.PI / 2;
        const r = R1 - 8; // Positionner juste à l'intérieur du donut extérieur
        const arcWidth = 6; // Légèrement plus épais pour être plus visible
        const arcAngle = angleStep * 0.8; // Arc plus grand pour être plus visible
        const arcStart = angle - arcAngle / 2;
        const arcEnd = angle + arcAngle / 2;
        
        // Dessiner d'abord une ombre/outline plus sombre
        ctx.beginPath();
        ctx.arc(cx, cy, r, arcStart, arcEnd, false);
        ctx.lineWidth = arcWidth + 2;
        ctx.strokeStyle = "#cc9500"; // Or plus sombre pour l'outline
        ctx.globalAlpha = 0.85; // Légèrement plus opaque
        ctx.lineCap = "round";
        ctx.stroke();
        
        // Puis dessiner l'indicateur principal
        ctx.beginPath();
        ctx.arc(cx, cy, r, arcStart, arcEnd, false);
        ctx.lineWidth = arcWidth;
        ctx.strokeStyle = "#ffd700"; // Or plus visible
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 3; // Plus de flou pour meilleur effet
        ctx.globalAlpha = 1.0;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDayNumbers(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries) {
    ctx.save();
    // Ajuster la taille du texte en fonction de la taille du canvas
    const fontSize = Math.min(cx * 0.12, 18); 
    ctx.font = `bold ${fontSize}px Segoe UI, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    for (let i = 0; i < days; ++i) {
      const currentDate = new Date(year, month, i + 1);
      const isWeekendDay = Utils.isWeekend(currentDate);
      const isFerie = Utils.isJourFerie(currentDate, joursFeries);
      
      let textColor = "#333";
      if (isFerie) {
        textColor = "#666";
      } else if (isWeekendDay) {
        textColor = "#888";
      }
      
      const angle = (i + 0.5) * angleStep - Math.PI / 2;
      const r = (R1 + R2) / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      
      ctx.fillStyle = textColor;
      ctx.fillText(String(i + 1), x, y);
    }
    ctx.restore();
  }

  drawCenterCircle(ctx, cx, cy, R2) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R2 - 15, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#e5e9f0";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  // Nettoyer le cache
  clearCache() {
    this.canvasCache.clear();
    this.lastRenderData.clear();
  }
}

// Instance globale
const canvasRenderer = new CanvasRenderer();

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CanvasRenderer, canvasRenderer };
}
