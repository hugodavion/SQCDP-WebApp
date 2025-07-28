// js/auth.js
// Configuration sécurisée - utilise les variables d'environnement
const SUPABASE_URL = window.ENV_CONFIG?.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = window.ENV_CONFIG?.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
let supabase;
if (window.Supabase && typeof window.Supabase.createClient === 'function') {
  supabase = window.Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else if (window.supabase && typeof window.supabase.createClient === 'function') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  alert('Erreur : Le SDK Supabase n\'est pas chargé.');
}

const loginDialog = document.getElementById('login-dialog');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');


// Le masquage immédiat est géré par un style inline dans le <head> (voir index.html)

// Vérifie la session à l'ouverture
document.addEventListener('DOMContentLoaded', () => {
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

// Déconnexion (à appeler sur un bouton logout)
window.logout = async function() {
  await supabase.auth.signOut();
  location.reload();
};
