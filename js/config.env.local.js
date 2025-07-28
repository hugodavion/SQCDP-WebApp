// Configuration d'environnement LOCALE - Vos vraies valeurs
const ENV_CONFIG = {
  SUPABASE_URL: 'https://hinhxyynpbetefknrupz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpbmh4eXlucGJldGVma25ydXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTU3MTEsImV4cCI6MjA2ODk3MTcxMX0.X8MXHtZlcWkJ176D2hHQeoL_JjMz3ajWYWiFMvc1h5s'
};

// Export pour utilisation
if (typeof window !== 'undefined') {
  window.ENV_CONFIG = ENV_CONFIG;
}
