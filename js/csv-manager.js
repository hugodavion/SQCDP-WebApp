// Gestionnaire d'export/import CSV
class CSVManager {
  constructor() {
    this.delimiter = ';';
  }

  // Exporter les données en CSV
  exportToCSV(data, filename = 'sqcdp-export.csv') {
    if (!data) return null;
    
    // Conversion en format CSV
    const csvContent = this.convertToCSV(data);
    
    // Création du lien de téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Conversion des données en format CSV
  convertToCSV(data) {
    if (!data || !Array.isArray(data)) return '';
    
    // Extraire les en-têtes à partir des clés du premier élément
    const headers = Object.keys(data[0] || {});
    
    // Ligne d'en-tête
    let csvContent = headers.join(this.delimiter) + '\r\n';
    
    // Lignes de données
    data.forEach(item => {
      const row = headers.map(header => {
        // Échappement des valeurs contenant des délimiteurs ou retours à la ligne
        let cellValue = item[header] === null ? '' : item[header];
        cellValue = String(cellValue);
        if (cellValue.includes(this.delimiter) || cellValue.includes('\n')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      });
      csvContent += row.join(this.delimiter) + '\r\n';
    });
    
    return csvContent;
  }

  // Importer des données depuis un fichier CSV
  async importFromCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          const importedData = this.parseCSV(csvData);
          resolve(importedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier CSV'));
      };
      
      reader.readAsText(file);
    });
  }

  // Analyser un contenu CSV
  parseCSV(csvContent) {
    if (!csvContent) return [];
    
    // Diviser par lignes
    const lines = csvContent.split(/\r\n|\n/);
    if (lines.length === 0) return [];
    
    // Extraire les en-têtes
    const headers = this.splitCSVLine(lines[0]);
    
    // Traiter les lignes de données
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.splitCSVLine(line);
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] !== undefined ? values[index] : '';
      });
      
      result.push(obj);
    }
    
    return result;
  }

  // Diviser une ligne CSV en respectant les guillemets
  splitCSVLine(line) {
    const result = [];
    let startPos = 0;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      // Gestion des guillemets
      if (line[i] === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      
      // Traitement des délimiteurs
      if (line[i] === this.delimiter && !inQuotes) {
        let field = line.substring(startPos, i);
        
        // Nettoyer les guillemets
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.substring(1, field.length - 1);
        }
        field = field.replace(/""/g, '"');
        
        result.push(field);
        startPos = i + 1;
      }
    }
    
    // Traiter le dernier champ
    let lastField = line.substring(startPos);
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.substring(1, lastField.length - 1);
    }
    lastField = lastField.replace(/""/g, '"');
    result.push(lastField);
    
    return result;
  }
}

// Instance globale
const csvManager = new CSVManager();

// Export pour compatibilité
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CSVManager, csvManager };
}