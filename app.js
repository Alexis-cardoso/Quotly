// ══════════════════════════════
// GLOBALS
// ══════════════════════════════
var items = [];
var lang = 'fr';
var userLogoData = null;
var contractType = 'prestation';
var currentQuoteId = null;
var currentContractId = null;

// ══════════════════════════════
// NAVIGATION
// ══════════════════════════════
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'devis') loadQuotesList();
  if (page === 'contrats') loadContractsList();
  if (page === 'dashboard') loadDashboardStats();
  const bnPages = ['dashboard','devis','nouveau-devis','calculateur'];
  if (typeof setBN === 'function' && bnPages.includes(page)) setBN(page);
  if (typeof closeMore === 'function') closeMore();
}

function newDevis() {
  currentQuoteId = null;
  items = [];
  const clear = id => { const el = document.getElementById(id); if (el) el.value = ''; };
  clear('c-name'); clear('c-siret'); clear('c-addr'); clear('c-contact'); clear('c-email');
  goTo('nouveau-devis');
  renderItems(); updateTotals(); updatePDF();
}
function newContrat() {
  currentContractId = null;
  const clear = id => { const el = document.getElementById(id); if (el) el.value = ''; };
  clear('ct-client'); clear('ct-cli-siret'); clear('ct-client-email');
  goTo('nouveau-contrat');
  updateContract();
}

// ══════════════════════════════
// TOAST
// ══════════════════════════════
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.className = 'toast ' + type;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ══════════════════════════════
// LANG
// ══════════════════════════════
function setLang(l) {
  lang = l;
  document.getElementById('lang-fr').classList.toggle('active', l === 'fr');
  document.getElementById('lang-en').classList.toggle('active', l === 'en');
  document.documentElement.lang = l;
  document.querySelectorAll('[data-' + l + ']').forEach(el => {
    const val = el.getAttribute('data-' + l);
    if (!val) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      // skip values, only placeholders
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-' + l + '-placeholder]').forEach(el => {
    el.placeholder = el.getAttribute('data-' + l + '-placeholder');
  });
}

// ══════════════════════════════
// FORMAT CURRENCY
// ══════════════════════════════
function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ══════════════════════════════
// ITEMS
// ══════════════════════════════
function renderItems() {
  const body = document.getElementById('items-body');
  if (!body) return;
  body.innerHTML = items.map((item, i) => `
    <div class="items-row">
      <input class="field-input" value="${item.desc}" placeholder="Description..." oninput="items[${i}].desc=this.value;updatePDF()">
      <input class="field-input" type="number" value="${item.qty}" min="0" oninput="items[${i}].qty=parseFloat(this.value)||0;updateTotals()" style="text-align:center">
      <input class="field-input" value="${item.unit}" oninput="items[${i}].unit=this.value">
      <input class="field-input" type="number" value="${item.price}" min="0" oninput="items[${i}].price=parseFloat(this.value)||0;updateTotals()" style="text-align:right">
      <div class="item-total">${fmt(item.qty * item.price)}</div>
      <button class="del-btn" onclick="delItem(${i})">×</button>
    </div>
  `).join('');
  updateTotals();
}

function addItem() {
  const tjm = parseFloat(document.getElementById('f-tjm')?.value) || 550;
  items.push({ desc: '', qty: 1, unit: 'jour(s)', price: tjm });
  renderItems();
}

function delItem(i) {
  items.splice(i, 1);
  renderItems();
}

function recalcItems() {
  const tjm = parseFloat(document.getElementById('f-tjm')?.value) || 550;
  items = items.map(item => item.unit === 'jour(s)' ? { ...item, price: tjm } : item);
  renderItems();
}

function updateTotals() {
  const tvaRate = parseFloat(document.getElementById('f-tva-rate')?.value) / 100 || 0.2;
  const ht = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tva = ht * tvaRate;
  const ttc = ht + tva;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('t-ht', fmt(ht));
  set('t-tva', fmt(tva));
  set('t-ttc', fmt(ttc));
  const tl = document.getElementById('t-tva-label');
  if (tl) tl.textContent = `TVA (${Math.round(tvaRate * 100)}%)`;

  // PDF
  set('pt-ht', fmt(ht));
  set('pt-tva', fmt(tva));
  set('pt-ttc', fmt(ttc));
  const ptl = document.getElementById('pt-tva-lbl');
  if (ptl) ptl.textContent = `TVA (${Math.round(tvaRate * 100)}%)`;

  // PDF items
  const pdfItems = document.getElementById('pdf-items');
  if (pdfItems) {
    pdfItems.innerHTML = items.map(item => `
      <tr>
        <td>${item.desc || '—'}</td>
        <td style="text-align:right">${item.qty}</td>
        <td style="text-align:right">${item.unit}</td>
        <td style="text-align:right">${fmt(item.price)}</td>
        <td>${fmt(item.qty * item.price)}</td>
      </tr>
    `).join('');
  }
}

// ══════════════════════════════
// PDF UPDATE
// ══════════════════════════════
function g(id) { return document.getElementById(id)?.value || ''; }

function updatePDF() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
  const pLogo = document.getElementById('p-logo');
  if (pLogo) {
    if (userLogoData) { pLogo.src = userLogoData; pLogo.style.display = 'block'; }
    else { pLogo.style.display = 'none'; }
  }
  set('p-name', g('f-name'));
  set('p-contact', g('f-email') + ' · ' + g('f-phone'));
  set('p-siret', g('f-siret'));
  set('p-num', g('q-num'));
  set('p-date', g('q-date'));
  set('p-valid', g('q-valid'));
  set('p-fname', g('f-name'));
  set('p-fdetail', g('f-addr') + '<br>SIRET : ' + g('f-siret') + '<br>TVA : ' + g('f-tva-num'));
  set('p-cname', g('c-name'));
  set('p-cdetail', g('c-addr') + '<br>SIRET : ' + g('c-siret') + '<br>' + g('c-contact') + (g('c-email') ? ' · ' + g('c-email') : ''));
  set('p-note', g('f-note'));
  set('p-footer', g('f-email') + ' · ' + g('f-phone') + '<br>' + g('f-addr'));
  set('p-sign-client', g('c-name'));
  updateTotals();
}

// ══════════════════════════════
// AI GENERATION
// ══════════════════════════════
function generateDevisAI() {
  toast('✦ Fonctionnalité IA bientôt disponible', 'info');
}

// ══════════════════════════════
// CONTRAT
// ══════════════════════════════
function selectContractType(type) {
  contractType = type;
  ['prestation', 'cgv', 'nda'].forEach(t => {
    document.getElementById('ct-' + t)?.classList.toggle('active', t === type);
  });
  const titles = {
    prestation: { fr: 'Contrat de prestation de services', en: 'Service Agreement' },
    cgv: { fr: 'Conditions Générales de Vente (CGV)', en: 'General Terms of Sale (GTS)' },
    nda: { fr: 'Accord de Confidentialité (NDA)', en: 'Non-Disclosure Agreement (NDA)' }
  };
  const el = document.getElementById('ct-title');
  if (el) el.textContent = titles[type][lang];
  updateContract();
}

function updateContract() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const prov = g('ct-provider');
  const cli = g('ct-client');
  set('ct-subtitle', `Entre ${prov} et ${cli}`);
  set('ct-p-prov', prov);
  set('ct-p-cli', cli);
  set('ct-p-prov-detail', 'SIRET : ' + g('ct-prov-siret'));
  set('ct-p-cli-detail', 'SIRET : ' + g('ct-cli-siret'));
  set('ct-p-object', g('ct-object'));
  set('ct-p-amount', g('ct-amount'));
  set('ct-p-amount2', g('ct-amount'));
  set('ct-p-start', g('ct-start'));
  set('ct-p-end', g('ct-end'));
  set('ct-p-deliverables', g('ct-deliverables'));
  set('ct-sign-prov', prov);
  set('ct-sign-cli', cli);
}

function importFromDevis() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('ct-provider', g('f-name') || 'Jean Dupont');
  setVal('ct-client', g('c-name') || 'Acme Corp.');
  setVal('ct-prov-siret', g('f-siret') || '123 456 789 00012');
  setVal('ct-cli-siret', g('c-siret') || '987 654 321 00034');
  const ttc = document.getElementById('t-ttc')?.textContent || '4 920 €';
  setVal('ct-amount', ttc);
  updateContract();
  toast('✅ Données du devis importées !', 'success');
}

// ══════════════════════════════
// CALCULATEUR TJM
// ══════════════════════════════
function goToTJM() {
  var s = document.getElementById('tjm-free-screen');
  if (s) { s.style.display = 'block'; calcTJMFree(); }
}
function closeTJM() {
  var s = document.getElementById('tjm-free-screen');
  if (s) s.style.display = 'none';
}
function calcTJMFree() {
  var revenu = parseFloat((document.getElementById('tjm-revenu')||{}).value||4000)||4000;
  var jours = parseFloat((document.getElementById('tjm-jours')||{}).value||18)||18;
  var charges = parseFloat((document.getElementById('tjm-charges')||{}).value||45)||45;
  var conges = parseFloat((document.getElementById('tjm-conges')||{}).value||5)||5;
  var joursAn = jours * (12 - conges * 12/52);
  var caAnnuel = (revenu * 12) / (1 - charges/100);
  var tjm = caAnnuel / joursAn;
  var r = document.getElementById('tjm-result-free'); if (r) r.textContent = Math.round(tjm) + ' €';
  var ca = document.getElementById('tjm-ca-free'); if (ca) ca.textContent = Math.round(caAnnuel).toLocaleString('fr-FR') + ' €';
  var net = document.getElementById('tjm-net-free'); if (net) net.textContent = Math.round(revenu*12).toLocaleString('fr-FR') + ' €';
}

function calcTJM() {
  const revenu = parseFloat(document.getElementById('tjm-revenu')?.value) || 4000;
  const jours = parseFloat(document.getElementById('tjm-jours')?.value) || 18;
  const charges = (parseFloat(document.getElementById('tjm-charges')?.value) || 45) / 100;
  const conges = parseFloat(document.getElementById('tjm-conges')?.value) || 5;

  const moisTrav = 12 - conges / 4.33;
  const joursAn = jours * moisTrav;
  const caNeeded = (revenu / (1 - charges)) * 12;
  const tjm = Math.round(caNeeded / joursAn);
  const ca = Math.round(tjm * joursAn);
  const netAn = Math.round(revenu * 12);
  const eqSalaire = Math.round(ca * 0.65);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('tjm-result', tjm.toLocaleString('fr-FR') + ' €');
  set('tjm-ca', ca.toLocaleString('fr-FR') + ' €');
  set('tjm-net', netAn.toLocaleString('fr-FR') + ' €');
  set('tjm-mensuel', revenu.toLocaleString('fr-FR') + ' €');
  set('tjm-eq-salaire', eqSalaire.toLocaleString('fr-FR') + ' €');
}

function useTJM() {
  const tjmVal = document.getElementById('tjm-result')?.textContent?.replace(' €','').replace(/\s/g,'') || '541';
  const tjmInput = document.getElementById('f-tjm');
  if (tjmInput) tjmInput.value = tjmVal;
  goTo('nouveau-devis');
  toast('🧮 TJM appliqué à vos devis !', 'success');
}

// ══════════════════════════════
// PROFIL
// ══════════════════════════════
function updateSidebar() {
  const name = document.getElementById('p-fullname')?.value || '';
  const company = document.getElementById('p-company')?.value || '';
  const display = company || name || 'Mon espace';

  // Sidebar name + avatar
  const sbName = document.getElementById('sb-username');
  const sbCompany = document.getElementById('sb-company');
  const sbAvatar = document.getElementById('sb-avatar');
  const sbAvatarImg = document.getElementById('sb-avatar-img');
  if (sbName) sbName.textContent = name || display;
  if (sbCompany) sbCompany.textContent = company;
  var sbLetter = document.getElementById('sb-avatar-letter'); if (sbLetter && !userLogoData) sbLetter.textContent = (company || name).charAt(0).toUpperCase() || 'Q';
  if (sbAvatarImg && userLogoData) { sbAvatarImg.src = userLogoData; sbAvatarImg.style.display = 'block'; if (sbAvatar) sbAvatar.style.display = 'none'; }

  // Dashboard welcome
  updateDashWelcome();

  // Update PDF header with company info
  updatePDF();
}

function updateDashWelcome() {
  const name = document.getElementById('p-fullname')?.value || '';
  const company = document.getElementById('p-company')?.value || '';

  const welcomeEl = document.getElementById('dash-welcome');
  const companyEl = document.getElementById('dash-company');
  const initialsEl = document.getElementById('dash-logo-initials');
  const logoPreview = document.getElementById('dash-logo-preview');

  const firstName = name.split(' ')[0] || '';
  if (welcomeEl) welcomeEl.textContent = firstName ? 'Bonjour, ' + firstName + ' 👋' : 'Bonjour 👋';
  if (companyEl) companyEl.textContent = company || '';

  // Logo or initials in dashboard banner
  if (userLogoData && logoPreview) {
    logoPreview.innerHTML = '<img src="' + userLogoData + '" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">';
  } else if (initialsEl) {
    const initials = company ? company.substring(0, 2).toUpperCase() : (name ? name.charAt(0).toUpperCase() : 'Q');
    initialsEl.textContent = initials;
  }
}

function handleLogoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    userLogoData = e.target.result;

    // Update profil preview
    const img = document.getElementById('logo-preview-img');
    const placeholder = document.getElementById('logo-preview-placeholder');
    const removeBtn = document.getElementById('logo-remove-btn');
    if (img) { img.src = userLogoData; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-block';

    // Refresh everywhere
    updateSidebar();
    updatePDF();
    toast('✅ Logo importé avec succès !', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  userLogoData = null;
  const img = document.getElementById('logo-preview-img');
  const placeholder = document.getElementById('logo-preview-placeholder');
  const removeBtn = document.getElementById('logo-remove-btn');
  const input = document.getElementById('logo-input');
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (input) input.value = '';
  updateSidebar();
  updatePDF();
  toast('Logo supprimé', 'info');
}

async function saveProfil() {
  var name=(document.getElementById('p-fullname')||{}).value||'';
  var email=(document.getElementById('p-email')||{}).value||'';
  var company=(document.getElementById('p-company')||{}).value||'';
  var siret=(document.getElementById('p-siret')||{}).value||'';
  var address=(document.getElementById('p-address')||{}).value||'';
  var tva=(document.getElementById('p-tva')||{}).value||'';
  if (_supabase && currentUser) {
    try {
      var r = await _supabase.from('profiles').upsert({ id:currentUser.id, full_name:name, email, company, siret, address, tva, updated_at:new Date().toISOString() });
      if (r.error) throw r.error;
    } catch(e) {
      toast('⚠️ Erreur lors de la sauvegarde : '+(e.message||'inconnue'),'error');
      return;
    }
  }
  toast('💾 Profil sauvegardé !','success');
  updateSidebar(); updatePDF();
}

// ══════════════════════════════
// PDF EXPORT
// ══════════════════════════════
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

async function buildPdf(elementId) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Aperçu introuvable');
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    throw new Error('Bibliothèque PDF non chargée');
  }
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  return pdf;
}

async function downloadPDF(elementId, filename) {
  toast('📄 Génération du PDF…','info');
  try {
    const pdf = await buildPdf(elementId);
    pdf.save(filename);
    toast('✅ PDF téléchargé !','success');
  } catch(e) {
    toast('⚠️ Erreur PDF : '+(e.message||'inconnue'),'error');
  }
}

function downloadDevisPDF() {
  const num = g('q-num') || 'devis';
  downloadPDF('pdf-preview', 'Devis-' + num.replace(/[^a-zA-Z0-9-]/g,'') + '.pdf');
}

function downloadContratPDF() {
  const client = g('ct-client') || 'contrat';
  downloadPDF('contract-preview', 'Contrat-' + client.replace(/[^a-zA-Z0-9]/g,'_') + '.pdf');
}

// ══════════════════════════════
// EMAIL SENDING
// ══════════════════════════════
async function sendDevis() {
  const clientEmail = g('c-email');
  if (!clientEmail) { toast('⚠️ Renseignez l\'email du client','error'); return; }
  if (!currentQuoteId) { await saveDevis(); if (!currentQuoteId) return; }
  toast('📧 Envoi en cours…','info');
  try {
    const pdf = await buildPdf('pdf-preview');
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const num = g('q-num') || 'devis';
    const providerName = g('f-name');
    const r = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: clientEmail,
        toName: g('c-name'),
        fromEmail: g('f-email'),
        fromName: providerName,
        subject: 'Devis ' + num + ' — ' + providerName,
        htmlContent: '<p>Bonjour,</p><p>Veuillez trouver ci-joint votre devis <strong>' + escapeHtml(num) + '</strong>.</p><p>N\'hésitez pas à répondre directement à cet email pour toute question.</p><p>Cordialement,<br>' + escapeHtml(providerName) + '</p>',
        attachmentBase64: pdfBase64,
        attachmentName: 'Devis-' + num.replace(/[^a-zA-Z0-9-]/g,'') + '.pdf'
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur d\'envoi');
    if (_supabase && currentUser && currentQuoteId) {
      await _supabase.from('quotes').update({ status: 'envoye' }).eq('id', currentQuoteId);
    }
    toast('✅ Devis envoyé à ' + clientEmail + ' !','success');
  } catch(e) {
    toast('⚠️ Erreur envoi : '+(e.message||'inconnue'),'error');
  }
}

async function sendContrat() {
  const clientEmail = g('ct-client-email');
  if (!clientEmail) { toast('⚠️ Renseignez l\'email du client','error'); return; }
  if (!currentContractId) { await saveContrat(); if (!currentContractId) return; }
  toast('📧 Envoi en cours…','info');
  try {
    const pdf = await buildPdf('contract-preview');
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const client = g('ct-client') || 'contrat';
    const providerName = g('ct-provider');
    const r = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: clientEmail,
        toName: client,
        fromEmail: g('f-email'),
        fromName: providerName,
        subject: 'Contrat — ' + providerName,
        htmlContent: '<p>Bonjour,</p><p>Veuillez trouver ci-joint le contrat.</p><p>N\'hésitez pas à répondre directement à cet email pour toute question.</p><p>Cordialement,<br>' + escapeHtml(providerName) + '</p>',
        attachmentBase64: pdfBase64,
        attachmentName: 'Contrat-' + client.replace(/[^a-zA-Z0-9]/g,'_') + '.pdf'
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur d\'envoi');
    if (_supabase && currentUser && currentContractId) {
      await _supabase.from('contracts').update({ status: 'envoye' }).eq('id', currentContractId);
    }
    toast('✅ Contrat envoyé à ' + clientEmail + ' !','success');
  } catch(e) {
    toast('⚠️ Erreur envoi : '+(e.message||'inconnue'),'error');
  }
}

// ══════════════════════════════
// DEVIS PERSISTENCE
// ══════════════════════════════

async function saveDevis() {
  if (!_supabase || !currentUser) { toast('⚠️ Connectez-vous pour sauvegarder','error'); return; }
  const tvaRate = parseFloat(document.getElementById('f-tva-rate')?.value) / 100 || 0.2;
  const ht = items.reduce((s, i) => s + (i.qty||0) * (i.price||0), 0);
  const ttc = ht * (1 + tvaRate);
  const payload = {
    user_id: currentUser.id,
    client_name: g('c-name') || '',
    client_email: g('c-email') || '',
    items: items,
    total_ht: ht,
    total_ttc: ttc
  };
  try {
    let r;
    if (currentQuoteId) {
      r = await _supabase.from('quotes').update(payload).eq('id', currentQuoteId).select().single();
    } else {
      r = await _supabase.from('quotes').insert(payload).select().single();
    }
    if (r.error) throw r.error;
    currentQuoteId = r.data.id;
    toast('💾 Devis sauvegardé !','success');
  } catch(e) {
    toast('⚠️ Erreur : '+(e.message||'inconnue'),'error');
  }
}

async function loadQuotesList() {
  const tbody = document.getElementById('devis-tbody');
  if (!tbody) return;
  if (!_supabase || !currentUser) { tbody.innerHTML = ''; return; }
  try {
    const r = await _supabase.from('quotes').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (r.error) throw r.error;
    const rows = r.data || [];
    const sub = document.getElementById('devis-count-sub');
    if (sub) sub.textContent = rows.length + (lang === 'en' ? ' quotes total' : ' devis au total');
    const badge = document.getElementById('badge-devis');
    if (badge) badge.textContent = rows.length;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">' + (lang==='en' ? 'No quotes yet — create your first one.' : 'Aucun devis pour l\'instant — créez le premier.') + '</td></tr>';
      return;
    }
    const statusMap = { brouillon: ['badge-amber','Brouillon'], envoye: ['badge-blue','Envoyé'], accepte: ['badge-green','Accepté'], refuse: ['badge-red','Refusé'] };
    tbody.innerHTML = rows.map(q => {
      const st = statusMap[q.status] || statusMap.brouillon;
      const date = q.created_at ? new Date(q.created_at).toLocaleDateString('fr-FR') : '';
      return '<tr>' +
        '<td class="bold">' + escapeHtml(q.id.slice(0,8)) + '</td>' +
        '<td class="bold">' + escapeHtml(q.client_name || '—') + '</td>' +
        '<td style="color:var(--muted)">' + escapeHtml(q.subject || '') + '</td>' +
        '<td style="color:var(--muted)">' + date + '</td>' +
        '<td class="bold">' + fmt(q.total_ttc || 0) + '</td>' +
        '<td><span class="badge ' + st[0] + '">' + st[1] + '</span></td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="viewDevis(\'' + q.id + '\')">' + (lang==='en'?'View':'Voir') + '</button></td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:32px;">Erreur de chargement</td></tr>';
  }
}

// ══════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════
async function loadDashboardStats() {
  if (!_supabase || !currentUser) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  try {
    const r = await _supabase.from('quotes').select('*').eq('user_id', currentUser.id);
    if (r.error) throw r.error;
    const quotes = r.data || [];
    const thisYear = new Date().getFullYear();
    const quotesThisYear = quotes.filter(q => q.created_at && new Date(q.created_at).getFullYear() === thisYear);
    const ca = quotesThisYear.reduce((s, q) => s + (q.total_ttc || 0), 0);
    set('kpi-ca', fmt(ca));
    set('kpi-ca-sub', quotesThisYear.length + ' devis cette année');

    set('kpi-quotes-count', quotes.length);
    const accepted = quotes.filter(q => q.status === 'accepte');
    const sent = quotes.filter(q => q.status !== 'brouillon');
    const rate = sent.length ? Math.round(accepted.length / sent.length * 100) : 0;
    set('kpi-quotes-accepted', accepted.length + (accepted.length > 1 ? ' acceptés' : ' accepté'));
    set('kpi-quotes-rate', rate + '% taux');

    const pending = quotes.filter(q => q.status === 'envoye');
    const pendingSum = pending.reduce((s, q) => s + (q.total_ttc || 0), 0);
    set('kpi-pending', fmt(pendingSum));
    set('kpi-pending-sub', pending.length + ' à relancer');

    const tbody = document.getElementById('dash-recent-devis');
    if (tbody) {
      const recent = quotes.slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
      if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding:20px 22px;color:#9191aa;font-size:13px;">Aucun devis pour l\'instant.</td></tr>';
      } else {
        const statusStyle = {
          brouillon: ['#eef2ff','#4f46e5','Brouillon'],
          envoye: ['#fffbeb','#d97706','Envoyé'],
          accepte: ['#ecfdf5','#059669','Accepté'],
          refuse: ['#fef2f2','#dc2626','Refusé']
        };
        tbody.innerHTML = recent.map(q => {
          const st = statusStyle[q.status] || statusStyle.brouillon;
          return '<tr style="border-top:1px solid #f0ede6;">' +
            '<td style="padding:13px 22px;"><div style="font-size:13px;font-weight:700;color:#16162a;">' + escapeHtml(q.client_name || '—') + '</div></td>' +
            '<td style="padding:13px 16px;font-size:14px;font-weight:700;color:#16162a;">' + fmt(q.total_ttc || 0) + '</td>' +
            '<td style="padding:13px 22px;text-align:right;"><span style="background:' + st[0] + ';color:' + st[1] + ';padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;">' + st[2] + '</span></td>' +
          '</tr>';
        }).join('');
      }
    }
  } catch(e) { console.error(e); }
}

async function viewDevis(id) {
  currentQuoteId = id;
  goTo('nouveau-devis');
  if (!_supabase || !currentUser) return;
  try {
    const r = await _supabase.from('quotes').select('*').eq('id', id).eq('user_id', currentUser.id).single();
    if (r.error) throw r.error;
    const q = r.data;
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
    setVal('c-name', q.client_name);
    setVal('c-email', q.client_email);
    items = Array.isArray(q.items) ? q.items : [];
    renderItems();
    updateTotals();
    updatePDF();
  } catch(e) {
    toast('⚠️ Erreur de chargement du devis','error');
  }
}

// ══════════════════════════════
// CONTRAT PERSISTENCE
// ══════════════════════════════
async function saveContrat() {
  if (!_supabase || !currentUser) { toast('⚠️ Connectez-vous pour sauvegarder','error'); return; }
  const preview = document.getElementById('contract-preview');
  const payload = {
    user_id: currentUser.id,
    type: contractType,
    client_name: g('ct-client') || '',
    client_email: g('ct-client-email') || '',
    content: preview ? preview.innerHTML : ''
  };
  try {
    let r;
    if (currentContractId) {
      r = await _supabase.from('contracts').update(payload).eq('id', currentContractId).select().single();
    } else {
      r = await _supabase.from('contracts').insert(payload).select().single();
    }
    if (r.error) throw r.error;
    currentContractId = r.data.id;
    toast('💾 Contrat sauvegardé !','success');
  } catch(e) {
    toast('⚠️ Erreur : '+(e.message||'inconnue'),'error');
  }
}

async function loadContractsList() {
  const tbody = document.getElementById('contrats-tbody');
  if (!tbody) return;
  if (!_supabase || !currentUser) { tbody.innerHTML = ''; return; }
  try {
    const r = await _supabase.from('contracts').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (r.error) throw r.error;
    const rows = r.data || [];
    const sub = document.getElementById('contrats-count-sub');
    if (sub) sub.textContent = rows.length + (lang === 'en' ? ' contracts total' : ' contrats au total');
    const badge = document.getElementById('badge-contrats');
    if (badge) badge.textContent = rows.length;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;">' + (lang==='en' ? 'No contracts yet — create your first one.' : 'Aucun contrat pour l\'instant — créez le premier.') + '</td></tr>';
      return;
    }
    const typeLabel = { prestation: 'Prestation', cgv: 'CGV', nda: 'NDA' };
    tbody.innerHTML = rows.map(c => {
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '';
      return '<tr>' +
        '<td class="bold">' + escapeHtml(c.id.slice(0,8)) + '</td>' +
        '<td><span class="badge badge-blue">' + (typeLabel[c.type] || escapeHtml(c.type || '')) + '</span></td>' +
        '<td class="bold">' + escapeHtml(c.client_name || '—') + '</td>' +
        '<td style="color:var(--muted)">' + date + '</td>' +
        '<td><span class="badge badge-amber">' + (c.status || 'brouillon') + '</span></td>' +
        '<td><button class="btn btn-ghost btn-sm" onclick="viewContrat(\'' + c.id + '\')">' + (lang==='en'?'View':'Voir') + '</button></td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:32px;">Erreur de chargement</td></tr>';
  }
}

async function viewContrat(id) {
  currentContractId = id;
  goTo('nouveau-contrat');
  if (!_supabase || !currentUser) return;
  try {
    const r = await _supabase.from('contracts').select('*').eq('id', id).eq('user_id', currentUser.id).single();
    if (r.error) throw r.error;
    const c = r.data;
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
    setVal('ct-client', c.client_name);
    setVal('ct-client-email', c.client_email);
    if (c.type) selectContractType(c.type);
    updateContract();
  } catch(e) {
    toast('⚠️ Erreur de chargement du contrat','error');
  }
}

// ══════════════════════════════
// LEGAL PAGES
// ══════════════════════════════
function openLegal(page) {
  var el = document.getElementById('legal-' + page);
  if (el) { el.style.display = 'block'; el.scrollTop = 0; }
}
function closeLegal(page) {
  var el = document.getElementById('legal-' + page);
  if (el) el.style.display = 'none';
}

// ══════════════════════════════
// INIT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initSupabase === 'function') initSupabase();
  if (typeof checkPaymentReturn === 'function') checkPaymentReturn();
  if (typeof checkExistingSession === 'function') checkExistingSession();
  renderItems()

  updatePDF();
  updateContract();
  calcTJM();
  const today = new Date();
  const opts = { weekday:'long', day:'numeric', month:'long', year:'numeric' };
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = today.toLocaleDateString('fr-FR', opts);
});
