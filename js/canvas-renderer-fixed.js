// Gestionnaire de rendu Canvas optimisé
class CanvasRenderer {
  constructor() {
    this.canvasCache = new Map();
    this.lastRenderData = new Map();
  }

  // Méthode principale de rendu du donut
  drawDonut(canvasId, vals, axeKey, days) {
    // Vérifier si on a besoin de redessiner
    const dataKey = JSON.stringify({ vals, days });
    if (this.lastRenderData.get(canvasId) === dataKey) {
      return; // Pas de changement, éviter le redessinage
    }

    const colors = { ...AppState.colors, gris: "#e0e0e0" };
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R1 = 220;
    const R2 = 145;
    const angleStep = 2 * Math.PI / days;

    // Obtenir l'année et le mois
    const monthKey = Utils.getCurrentMonthYearKey();
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const joursFeries = dataManager.getJoursFeriesFrance(year);

    this.drawDayBackgrounds(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries);
    this.drawStateColors(ctx, cx, cy, R1, R2, angleStep, vals, colors, days);
    this.drawCurrentDayIndicator(ctx, cx, cy, R1, R2, angleStep, days, monthKey);
    this.drawCommentIndicators(ctx, cx, cy, R1, R2, angleStep, vals, days);
    this.drawDayNumbers(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries);
    this.drawCenterCircle(ctx, cx, cy, R2);
    this.drawAxeLetter(ctx, cx, cy, axeKey);

    // Mettre en cache les données de rendu
    this.lastRenderData.set(canvasId, dataKey);
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

  drawStateColors(ctx, cx, cy, R1, R2, angleStep, vals, colors, days) {
    for (let i = 0; i < days; ++i) {
      const etat = vals[i] && vals[i].etat ? vals[i].etat : "gris";
      const color = colors[etat] || colors.gris;
      
      if (etat !== "gris") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, (R1 + R2) / 2, i * angleStep - Math.PI / 2, (i + 1) * angleStep - Math.PI / 2, false);
        ctx.lineWidth = R1 - R2 - 6;
        ctx.strokeStyle = color;
        ctx.lineCap = "butt";
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.restore();
      }
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
        const angle = (todayIdx + 0.5) * angleStep - Math.PI / 2;
        
        // Calculer les positions pour entourer complètement le secteur
        const innerRadius = R2 - 5;
        const outerRadius = R1 + 5;
        
        ctx.save();
        
        // Dessiner le contour complet du secteur
        const sectorAngleStart = todayIdx * angleStep - Math.PI / 2;
        const sectorAngleEnd = (todayIdx + 1) * angleStep - Math.PI / 2;
        
        ctx.beginPath();
        // Arc extérieur
        ctx.arc(cx, cy, outerRadius, sectorAngleStart, sectorAngleEnd, false);
        // Ligne radiale droite
        ctx.lineTo(
          cx + Math.cos(sectorAngleEnd) * innerRadius,
          cy + Math.sin(sectorAngleEnd) * innerRadius
        );
        // Arc intérieur (en sens inverse)
        ctx.arc(cx, cy, innerRadius, sectorAngleEnd, sectorAngleStart, true);
        // Ligne radiale gauche pour fermer
        ctx.closePath();
        
        // Style du contour
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#3A55A4";
        ctx.shadowColor = "#3A55A4";
        ctx.shadowBlur = 6;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        
        ctx.restore();
      }
    }
  }

  drawCommentIndicators(ctx, cx, cy, R1, R2, angleStep, vals, days) {
    ctx.save();
    for (let i = 0; i < days; ++i) {
      const v = vals[i];
      if (v && Array.isArray(v.commentaires) && v.commentaires.length > 0) {
        const angle = (i + 0.5) * angleStep - Math.PI / 2;
        const r = R1 - 8;
        const arcWidth = 5;
        const arcAngle = angleStep * 0.7;
        const arcStart = angle - arcAngle / 2;
        const arcEnd = angle + arcAngle / 2;

        // Outline plus foncé (bleu foncé ou noir)
        ctx.beginPath();
        ctx.arc(cx, cy, r, arcStart, arcEnd, false);
        ctx.lineWidth = arcWidth + 2;
        ctx.strokeStyle = "#0d2c5a"; // Bleu foncé (ou mets "#111" pour noir)
        ctx.globalAlpha = 0.8;
        ctx.lineCap = "round";
        ctx.stroke();

        // Indicateur principal (bleu vif ou noir)
        ctx.beginPath();
        ctx.arc(cx, cy, r, arcStart, arcEnd, false);
        ctx.lineWidth = arcWidth;
        ctx.strokeStyle = "#3A55A4"; // Bleu vif (ou mets "#000" pour noir)
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 2;
        ctx.globalAlpha = 1.0;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDayNumbers(ctx, cx, cy, R1, R2, angleStep, days, year, month, joursFeries) {
    ctx.save();
    ctx.font = "bold 20px Segoe UI, Arial";
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
