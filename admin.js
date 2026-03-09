/* ═══ CREDENCIAIS ═══ */
const CREDS = { email:'admin@maripierami.com.br', senha:'mari2025' };

/* ═══ STORAGE ═══ */
function load(key, fb) {
  try { const v = localStorage.getItem('mp_'+key); return v!==null ? JSON.parse(v) : fb } catch { return fb }
}
function save(key, val) { localStorage.setItem('mp_'+key, JSON.stringify(val)) }

/* ═══ STATE ═══ */
let pacKpiFilter    = 'active';
let panelListFilter = 'all';

/* ═══ INIT ═══ */
window.onload = () => {
  if (localStorage.getItem('mp_auth') === '1') showDashboard();
  else showLogin();
};

/* ═══ LOGIN / LOGOUT ═══ */
function showLogin() {
  document.getElementById('login-page').style.display  = 'flex';
  document.getElementById('dashboard-page').style.display = 'none';
}
function showDashboard() {
  document.getElementById('login-page').style.display  = 'none';
  document.getElementById('dashboard-page').style.display = 'block';
  initDashboard();
}
function doLogin() {
  const email  = document.getElementById('login-email').value.trim().toLowerCase();
  const senha  = document.getElementById('login-senha').value;
  const errEl  = document.getElementById('login-error');
  const errMsg = document.getElementById('login-error-msg');
  if (email === CREDS.email && senha === CREDS.senha) {
    localStorage.setItem('mp_auth', '1');
    errEl.classList.remove('visible');
    showDashboard();
  } else {
    errMsg.textContent = 'E-mail ou senha incorretos.';
    errEl.classList.add('visible');
    document.getElementById('login-senha').value = '';
  }
}
function doLogout() { localStorage.removeItem('mp_auth'); showLogin(); }
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') doLogin();
});

/* ═══ DASHBOARD INIT ═══ */
function initDashboard() {
  const now = new Date();
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
       .replace(/^\w/, c => c.toUpperCase());
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('topbar-month').textContent = months[now.getMonth()] + ' · ' + now.getFullYear();
  renderKPIs();
  renderPatients();
  renderPayments();
  initNotes();
  setTimeout(drawSparks, 120);
}

/* ═══ KPI LABELS ═══ */
const FILTER_LABELS = {
  active: 'Pacientes Ativos',
  new:    'Pacientes Novos',
  paused: 'Pacientes Pausados',
  all:    'Total de Pacientes'
};

function countByTag(list, tag) {
  return tag === 'all' ? list.length : list.filter(p => p.tag === tag).length;
}

function renderKPIs() {
  const list  = load('patients', []);
  const count = countByTag(list, pacKpiFilter);
  document.getElementById('val-pac').textContent     = count;
  document.getElementById('pac-kpi-label').textContent = FILTER_LABELS[pacKpiFilter] || 'Pacientes';
  const ativos   = countByTag(list, 'active');
  const novos    = countByTag(list, 'new');
  const pausados = countByTag(list, 'paused');
  const subs = { active: `${novos} novos · ${pausados} pausados`, new: `${ativos} ativos · ${pausados} pausados`,
                 paused: `${ativos} ativos · ${novos} novos`,    all: `${ativos} ativos · ${novos} novos · ${pausados} pausados` };
  document.getElementById('delta-pac').textContent = list.length ? subs[pacKpiFilter] : '— nenhum cadastrado';
  updateRecebido();
  drawSparks();
}

function setPacFilter(f) {
  pacKpiFilter = f;
  document.querySelectorAll('#pac-filter .kf-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderKPIs();
}

function setPanelFilter(f) {
  panelListFilter = f;
  document.querySelectorAll('#panel-pac-filter .pf-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderPatients();
}

function updateRecebido() {
  const pays     = load('payments', []);
  const received = pays.filter(p => p.paid).reduce((s,p) => s + p.value, 0);
  const total    = pays.reduce((s,p) => s + p.value, 0);
  document.getElementById('val-rec').textContent   = 'R$ ' + received.toLocaleString('pt-BR');
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  document.getElementById('delta-rec').textContent = `${pays.filter(p=>p.paid).length} de ${pays.length} pagamentos confirmados`;
  document.getElementById('pay-pct').textContent   = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('pay-total').textContent    = 'R$ ' + total.toLocaleString('pt-BR');
  document.getElementById('pay-received').textContent = 'R$ ' + received.toLocaleString('pt-BR');
}

/* ═══ SPARKLINES ═══ */
function drawSparks() {
  const list = load('patients', []);
  const pac  = countByTag(list, pacKpiFilter);
  const pays = load('payments', []);
  const rec  = pays.filter(p => p.paid).reduce((s,p) => s + p.value, 0);
  const makeSpark = (el, val, max, color) => {
    if (!el || !max) { if(el) el.innerHTML=''; return }
    const w=el.offsetWidth||180, h=32, pts=7, seed=val||1;
    const rng = i => ((Math.sin(seed*9301+i*49297+233*i*i)*826)%1+1)/2;
    const ys = Array.from({length:pts}, (_,i) => rng(i));
    ys[pts-1] = val/max;
    const xs = Array.from({length:pts}, (_,i) => i/(pts-1)*w);
    const yS = ys.map(y => h-4-(y*(h-8)));
    let path = `M${xs[0]},${yS[0]}`;
    for (let i=1;i<pts;i++) { const cx=(xs[i]+xs[i-1])/2; path+=` C${cx},${yS[i-1]} ${cx},${yS[i]} ${xs[i]},${yS[i]}`; }
    const area = path + ` L${xs[pts-1]},${h} L${xs[0]},${h} Z`;
    const id = 'sg' + color.replace(/[^a-z0-9]/gi,'');
    el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".16"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${id})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${xs[pts-1]}" cy="${yS[pts-1]}" r="2.5" fill="${color}"/></svg>`;
  };
  makeSpark(document.getElementById('spark-pac'), pac, Math.max(pac,20), '#B07048');
  makeSpark(document.getElementById('spark-rec'), rec, Math.max(rec,1000), '#4A7FA5');
}
window.addEventListener('resize', drawSparks);

/* ═══ PACIENTES ═══ */
const AV_COLORS = ['av-0','av-1','av-2','av-3'];
const TAG_MAP   = { active:['Ativo','pb-active'], new:['Novo','pb-new'], paused:['Pausado','pb-paused'] };

function renderPatients() {
  const all  = load('patients', []);
  const list = panelListFilter === 'all' ? all : all.filter(p => p.tag === panelListFilter);
  const el   = document.getElementById('patients-list');
  document.getElementById('pat-count').textContent =
    panelListFilter === 'all' ? all.length : `${list.length}/${all.length}`;
  if (!all.length)  { el.innerHTML = '<div class="empty">Nenhum paciente cadastrado ainda.</div>'; return; }
  if (!list.length) { el.innerHTML = '<div class="empty">Nenhum paciente com esse status.</div>';  return; }
  el.innerHTML = list.map(p => {
    const i = all.indexOf(p);
    const [label, cls] = TAG_MAP[p.tag] || TAG_MAP.active;
    const initials = p.name.split(' ').slice(0,2).map(w => w[0]||'').join('').toUpperCase();
    return `<div class="pat-row">
      <div class="pat-av ${AV_COLORS[i%4]}">${initials}</div>
      <div class="pat-info">
        <div class="pat-name">${escHtml(p.name)}</div>
        <div class="pat-meta">${escHtml(p.info||'Individual')}</div>
      </div>
      <button class="pat-tag-toggle ${cls}" onclick="cycleTag(${i})" title="Clique para mudar status">${label}</button>
      <button class="pat-del" onclick="deletePatient(${i})" title="Remover">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');
}

function cycleTag(i) {
  const list  = load('patients', []);
  const cycle = { active:'new', new:'paused', paused:'active' };
  list[i].tag = cycle[list[i].tag] || 'active';
  save('patients', list);
  renderPatients();
  renderKPIs();
  showToast('Status: ' + TAG_MAP[list[i].tag][0]);
}

function toggleAddPatient() {
  const f = document.getElementById('add-patient-form');
  const open = f.classList.toggle('open');
  if (open) document.getElementById('new-pat-name').focus();
  else { document.getElementById('new-pat-name').value = ''; document.getElementById('new-pat-info').value = ''; }
}
function savePatient() {
  const name = document.getElementById('new-pat-name').value.trim();
  if (!name) return;
  const info = document.getElementById('new-pat-info').value.trim();
  const tag  = document.getElementById('new-pat-tag').value;
  const list = load('patients', []);
  list.push({name, info, tag});
  save('patients', list);
  toggleAddPatient(); renderPatients(); renderKPIs();
  showToast('✓ Paciente adicionado!');
}
function deletePatient(i) {
  const list = load('patients', []);
  list.splice(i, 1);
  save('patients', list);
  renderPatients(); renderKPIs();
  showToast('Paciente removido.');
}

/* ═══ PAGAMENTOS ═══ */
function renderPayments() {
  const pays = load('payments', []);
  const el   = document.getElementById('payments-list');
  document.getElementById('pay-count').textContent = pays.length;
  if (!pays.length) { el.innerHTML = '<div class="empty">Nenhum pagamento registrado ainda.</div>'; updateRecebido(); return; }
  el.innerHTML = pays.map((p,i) => `
    <div class="pay-row">
      <div class="pay-check ${p.paid?'done':''}" onclick="togglePay(${i})">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="pay-name ${p.paid?'done':''}">${escHtml(p.name)}</span>
      <span class="pay-amt  ${p.paid?'done':''}">R$ ${Number(p.value).toLocaleString('pt-BR')}</span>
      <span class="pay-date">${p.date||'—'}</span>
      <button class="pay-del" onclick="deletePayment(${i})" title="Remover">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');
  updateRecebido();
}
function toggleAddPay() {
  const f = document.getElementById('add-pay-form');
  const open = f.classList.toggle('open');
  if (open) { document.getElementById('new-pay-name').focus(); document.getElementById('new-pay-date').value = new Date().toISOString().split('T')[0]; }
  else { document.getElementById('new-pay-name').value = ''; document.getElementById('new-pay-val').value = ''; }
}
function savePayment() {
  const name  = document.getElementById('new-pay-name').value.trim();
  const value = parseFloat(document.getElementById('new-pay-val').value) || 0;
  const date  = document.getElementById('new-pay-date').value;
  if (!name || !value) return;
  const fmt  = date ? new Date(date+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'short'}) : '';
  const pays = load('payments', []);
  pays.push({name, value, date:fmt, paid:false});
  save('payments', pays); toggleAddPay(); renderPayments();
  showToast('✓ Pagamento adicionado!');
}
function togglePay(i) {
  const pays = load('payments', []);
  pays[i].paid = !pays[i].paid;
  save('payments', pays); renderPayments();
  showToast(pays[i].paid ? '✓ Pagamento confirmado!' : 'Pagamento desmarcado.');
}
function deletePayment(i) {
  const pays = load('payments', []);
  pays.splice(i, 1);
  save('payments', pays); renderPayments();
  showToast('Pagamento removido.');
}

/* ═══ NOTES ═══ */
function initNotes() {
  const ta = document.getElementById('notes-textarea');
  ta.value = load('notes', '');
  ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
  let timer;
  ta.addEventListener('input', () => {
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    clearTimeout(timer);
    timer = setTimeout(() => {
      save('notes', ta.value);
      const s = document.getElementById('notes-saved');
      s.classList.add('show'); setTimeout(() => s.classList.remove('show'), 1800);
    }, 600);
  });
}

/* ═══ TOAST ═══ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ═══ UTILS ═══ */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}