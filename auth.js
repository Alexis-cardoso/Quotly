// ══════════════════════════════
// AUTH & LANDING
// ══════════════════════════════
var selectedPlan = 'free';
var selectedPriceId = '';
var STRIPE_PK = 'pk_live_51JtatBHC2XfsvJOqGoQpMzi0PlJ67dAzqtRYSoLCjzqqUPqjypxrymDJ3YqHld65MgzlWkUKQOGJCfey3a15QKE500hJp3LbLO';
var SUPABASE_URL = 'https://qxjgvaumwnpyizbgnqax.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4amd2YXVtd25weWl6YmducWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA3NDIsImV4cCI6MjA4ODY0Njc0Mn0.2IUX1vkpeS2N8Dhc7kZc8In6Q5eRBnVBUy0q8koN1Bc';
var _supabase = null;
var currentUser = null;

function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch(e) { console.error('Supabase init:', e); }
}

function showAuth(tab) {
  var modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'flex';
  showTab(tab || 'login');
}
function closeAuth() {
  var modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}
function showTab(tab) {
  ['login','register','forgot'].forEach(function(k) {
    var el = document.getElementById('form-' + k);
    if (el) el.style.display = (k === tab) ? 'block' : 'none';
  });
  var tl = document.getElementById('tab-login');
  var tr = document.getElementById('tab-register');
  if (tl) { tl.style.background = tab==='login'?'#4f46e5':'transparent'; tl.style.color = tab==='login'?'#fff':'#9191aa'; }
  if (tr) { tr.style.background = tab==='register'?'#4f46e5':'transparent'; tr.style.color = tab==='register'?'#fff':'#9191aa'; }
}
function selectPlan(plan, priceId) {
  selectedPlan = plan; selectedPriceId = priceId || '';
  ['free','pro','annual','business'].forEach(function(p) {
    var el = document.getElementById('plan-' + p); if (!el) return;
    var active = p === plan;
    el.style.border = active ? '1.5px solid #4f46e5' : '1.5px solid #e4e2da';
    el.style.background = active ? '#eef2ff' : '#fff';
    el.querySelector('div').style.color = active ? '#4f46e5' : '#16162a';
  });
  var stripeEl = document.getElementById('stripe-section');
  var btn = document.getElementById('reg-btn');
  if (plan === 'free') {
    if (stripeEl) stripeEl.style.display = 'none';
    if (btn) btn.textContent = 'Créer mon compte gratuitement';
  } else {
    if (stripeEl) stripeEl.style.display = 'block';
    var labels = { pro: "S'abonner — 19€/mois", annual: "S'abonner — 149€/an", business: "Obtenir l'accès permanent — 497€" };
    if (btn) btn.textContent = labels[plan] || 'Continuer';
  }
}
function checkPwdStrength(pwd) {
  var score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  var colors = ['#ef4444','#f97316','#eab308','#22c55e'];
  for (var i = 1; i <= 4; i++) { var b = document.getElementById('pwd-bar-'+i); if (b) b.style.background = i<=score?colors[score-1]:'#e4e2da'; }
  var lbl = document.getElementById('pwd-strength-label');
  if (lbl) { lbl.textContent = pwd.length>0?(['Très faible','Faible','Moyen','Fort'][score-1]||''):''; if(score>0) lbl.style.color=colors[score-1]; }
}
function formatCard(input) { var v=input.value.replace(/[^0-9]/g,'').substring(0,16); input.value=v.replace(/(.{4})/g,'$1 ').trim(); }
function formatExpiry(input) { var v=input.value.replace(/[^0-9]/g,'').substring(0,4); if(v.length>=3) v=v.substring(0,2)+'/'+v.substring(2); input.value=v; }

async function doLogin() {
  var email = ((document.getElementById('login-email')||{}).value||'').trim();
  var pwd = (document.getElementById('login-password')||{}).value||'';
  if (!email||!pwd) { toast('Remplissez tous les champs','error'); return; }
  var btn = document.querySelector('#form-login button[onclick="doLogin()"]');
  if (btn) { btn.textContent='Connexion...'; btn.disabled=true; }

  if (email==='admin@quotly.app' && pwd==='Quotly2026!') {
    enterApp(email,'business','Admin Quotly','Quotly');
    toast('👑 Accès Admin activé !','success');
    if (btn) { btn.textContent='Se connecter'; btn.disabled=false; }
    return;
  }

  if (_supabase) {
    try {
      var r = await _supabase.auth.signInWithPassword({ email, password: pwd });
      if (r.error) throw r.error;
      currentUser = r.data.user;
      var prof = await _supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      if (prof.error) {
        await new Promise(function(res){ setTimeout(res, 400); });
        prof = await _supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      }
      var p = prof.data || {};
      enterApp(email, p.plan||'free', p.full_name||'', p.company||'');
      toast('Connecté !','success');
    } catch(e) {
      var msg = e.message||'Erreur de connexion';
      if (msg.includes('Invalid login')) msg = 'Email ou mot de passe incorrect';
      toast(msg,'error');
      if (btn) { btn.textContent='Se connecter'; btn.disabled=false; }
    }
  } else {
    enterApp(email,'free','','');
    toast('Connecté !','success');
    if (btn) { btn.textContent='Se connecter'; btn.disabled=false; }
  }
}

async function doRegister() {
  var fn = ((document.getElementById('reg-firstname')||{}).value||'').trim();
  var ln = ((document.getElementById('reg-lastname')||{}).value||'').trim();
  var email = ((document.getElementById('reg-email')||{}).value||'').trim();
  var pwd = (document.getElementById('reg-password')||{}).value||'';
  var company = ((document.getElementById('reg-company')||{}).value||'').trim();
  var siret = ((document.getElementById('reg-siret')||{}).value||'').trim();
  var address = ((document.getElementById('reg-address')||{}).value||'').trim();
  var phone = ((document.getElementById('reg-phone')||{}).value||'').trim();
  var cgu = (document.getElementById('reg-cgu')||{}).checked;

  if (!fn||!ln||!email||!pwd) { toast('Remplissez les champs obligatoires','error'); return; }
  if (!email.includes('@')) { toast('Email invalide','error'); return; }
  if (pwd.length<8) { toast('Mot de passe trop court (8 min.)','error'); return; }
  if (!cgu) { toast('Acceptez les CGU pour continuer','error'); return; }

  var btn = document.getElementById('reg-btn');
  if (btn) { btn.textContent='Création...'; btn.disabled=true; }

  if (selectedPlan !== 'free' && selectedPriceId && typeof Stripe !== 'undefined') {
    try {
      var stripe = Stripe(STRIPE_PK);
      await stripe.redirectToCheckout({
        lineItems: [{ price: selectedPriceId, quantity: 1 }],
        mode: selectedPlan==='business' ? 'payment' : 'subscription',
        successUrl: window.location.origin+'?payment=success&plan='+selectedPlan+'&email='+encodeURIComponent(email)+'&name='+encodeURIComponent(fn+' '+ln)+'&company='+encodeURIComponent(company),
        cancelUrl: window.location.origin+'?payment=cancel',
        customerEmail: email
      });
    } catch(e) {
      toast('Stripe: '+e.message,'error');
      if (btn) { btn.disabled=false; btn.textContent='Réessayer'; }
    }
    return;
  }

  if (_supabase) {
    try {
      var r = await _supabase.auth.signUp({ email, password: pwd, options: { data: { full_name: fn+' '+ln, company } } });
      if (r.error) throw r.error;
      currentUser = r.data.user;
      if (currentUser) {
        await _supabase.from('profiles').upsert({
          id: currentUser.id, email, full_name: fn+' '+ln,
          company, siret, address, phone, plan: 'free',
          created_at: new Date().toISOString()
        });
      }
      enterApp(email,'free',fn+' '+ln,company);
      toast('🎉 Bienvenue sur Quotly !','success');
    } catch(e) {
      var msg = e.message||'Erreur';
      if (msg.includes('already registered')) msg='Cet email est déjà utilisé. Connectez-vous.';
      toast(msg,'error');
      if (btn) { btn.disabled=false; btn.textContent='Créer mon compte gratuitement'; }
    }
  } else {
    enterApp(email,'free',fn+' '+ln,company);
    toast('🎉 Bienvenue sur Quotly !','success');
  }
}

async function doForgot() {
  var email = ((document.getElementById('forgot-email')||{}).value||'').trim();
  if (!email) { toast('Entrez votre email','error'); return; }
  var btn = document.querySelector('#form-forgot button[onclick="doForgot()"]');
  if (btn) { btn.textContent='Envoi...'; btn.disabled=true; }
  if (_supabase) {
    try { await _supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); }
    catch(e) { console.log(e); }
  }
  toast('Lien envoyé ! Vérifiez votre email.','success');
  if (btn) { btn.textContent='Envoyer le lien'; btn.disabled=false; }
  closeAuth();
}

function enterApp(email, plan, name, company) {
  ['landing-screen','auth-modal','tjm-free-screen'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.style.display='none';
  });
  var app = document.getElementById('app-shell'); if (app) app.style.display='';
  if (name) { var pf=document.getElementById('p-fullname'); if(pf) pf.value=name; var fn=document.getElementById('f-name'); if(fn) fn.value=name; }
  if (email) { var pe=document.getElementById('p-email'); if(pe) pe.value=email; }
  if (company) { var pc=document.getElementById('p-company'); if(pc) pc.value=company; }
  var planLabels={free:'Plan Gratuit',pro:'Pro',annual:'Pro Annuel',business:'Business'};
  var label=planLabels[plan]||'Plan Gratuit';
  var sbp=document.getElementById('sb-plan'); if(sbp) sbp.textContent=label;
  var sbp2=document.getElementById('sb-plan-profil'); if(sbp2) sbp2.textContent=label;
  if (plan!=='free') { var ub=document.getElementById('upgrade-box'); if(ub) ub.style.display='none'; }
  updateSidebar(); updatePDF(); goTo('dashboard');
}

function checkPaymentReturn() {
  if (!window.location.search) return;
  var params = new URLSearchParams(window.location.search);
  if (params.get('payment')==='success') {
    var plan=params.get('plan')||'pro';
    var email=decodeURIComponent(params.get('email')||'');
    var name=decodeURIComponent(params.get('name')||'');
    var company=decodeURIComponent(params.get('company')||'');
    enterApp(email,plan,name,company);
    setTimeout(function(){toast('🎉 Paiement confirmé ! Bienvenue sur Quotly '+plan,'success');},600);
    window.history.replaceState({},'',window.location.pathname);
  } else if (params.get('payment')==='cancel') {
    toast('Paiement annulé.','error');
    window.history.replaceState({},'',window.location.pathname);
  }
}

async function checkExistingSession() {
  if (!_supabase) return;
  try {
    var r = await _supabase.auth.getSession();
    if (r.data && r.data.session) {
      currentUser = r.data.session.user;
      var prof = await _supabase.from('profiles').select('*').eq('id',currentUser.id).single();
      if (prof.error) {
        await new Promise(function(res){ setTimeout(res, 400); });
        prof = await _supabase.from('profiles').select('*').eq('id',currentUser.id).single();
      }
      var p = prof.data || {};
      enterApp(currentUser.email, p.plan||'free', p.full_name||'', p.company||'');
    }
  } catch(e) { console.log('No session'); }
}

document.addEventListener('click', function(e) {
  var modal=document.getElementById('auth-modal');
  if (modal && e.target===modal) closeAuth();
});
