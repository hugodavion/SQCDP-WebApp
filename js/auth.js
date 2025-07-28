// js/auth.js
// Configuration sécurisée - utilise les variables d'environnement
let supabase;

function initializeSupabase() {
  // Attendre que ENV_CONFIG soit disponible
  if (!window.ENV_CONFIG || !window.ENV_CONFIG.SUPABASE_URL) {
    console.log('⏳ Attente de la configuration...');
    setTimeout(initializeSupabase, 50);
    return;
  }

  const SUPABASE_URL = window.ENV_CONFIG.SUPABASE_URL;
  const SUPABASE_KEY = window.ENV_CONFIG.SUPABASE_KEY;

  if (window.Supabase && typeof window.Supabase.createClient === 'function') {
    supabase = window.Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase initialisé avec succès');
  } else if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase initialisé avec succès');
  } else {
    console.error('❌ Erreur : Le SDK Supabase n\'est pas chargé.');
    return;
  }

  // Initialiser l'authentification une fois Supabase prêt
  initializeAuth();
}

function initializeAuth() {
  const loginDialog = document.getElementById('login-dialog');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  if (!loginDialog || !loginForm || !loginError) {
    setTimeout(initializeAuth, 50);
    return;
  }

  // Vérifie la session à l'ouverture
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      if (!loginDialog.open) {
        loginDialog.style.display = "";
        loginDialog.showModal();
      }
    } else {
      loginDialog.close();
      loginDialog.remove(); // Supprime la modale du DOM
      // Retire le style de masquage initial
      const hideStyle = document.getElementById('hide-until-auth');
      if (hideStyle) hideStyle.remove();
    }
  });

  // Gestion du formulaire de connexion
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    loginError.textContent = '';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = 'Identifiants invalides';
    } else {
      loginDialog.close();
      loginDialog.remove(); // Supprime la modale du DOM
      location.reload();
    }
  });
}

// Déconnexion (à appeler sur un bouton logout)
window.logout = async function() {
  if (supabase) {
    await supabase.auth.signOut();
    location.reload();
  }
};

// Démarrer l'initialisation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  initializeSupabase();
});
