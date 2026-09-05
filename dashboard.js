const interfaceIcons = {"thermometer":"<path d=\"M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z\"/><path d=\"M12 7v11\"/><circle cx=\"12\" cy=\"18\" r=\"1.5\" fill=\"currentColor\"/>","drop":"<path d=\"M12 3S5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12-7-12Z\" fill=\"currentColor\" fill-opacity=\".2\"/><path d=\"M8 15a4 4 0 0 0 4 4\"/>","smile":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 14a4.5 4.5 0 0 0 8 0M8 9h.01M16 9h.01\"/>","chip":"<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4M18 9h4m-4 6h4\"/>","home":"<path d=\"m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9\"/>","data":"<rect x=\"4\" y=\"4\" width=\"16\" height=\"17\" rx=\"2\"/><path d=\"M8 2v4m8-4v4M4 9h16M8 13h2m4 0h2m-8 4h2m4 0h2\"/>","bell":"<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/>","chart":"<path d=\"M4 3v17h17M7 14l4-5 4 3 6-7\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6m0-10h.01\"/>","bulb":"<path d=\"M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z\"/>","wifi":"<path d=\"M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0M12 20h.01\"/>","fire":"<path d=\"M13 2c2 6-4 7-2 11 2-1 3-3 3-5 5 4 7 7 4 11a8 8 0 0 1-13-1C2 12 8 8 8 5c0 4 2 5 2 5s3-4 3-8Z\"/>","monitor":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M12 16v5m-5 0h10\"/>","check":"<path d=\"m5 12 4 4L19 6\"/>","snow":"<path d=\"M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3\"/>"};
function interfaceIcon(name){ return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${interfaceIcons[name] || interfaceIcons.info}</svg>`; }
// Consulta diária
(function(root) {
  const ZONE = 'America/Fortaleza';
  const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  function dayKey(date = new Date()) {
    const parts = Object.fromEntries(dateFormat.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function bounds(key) {
    const start = new Date(`${key}T00:00:00-03:00`);
    return { start, end: new Date(start.getTime() + 86400000) };
  }
  function shift(key, days) { return dayKey(new Date(bounds(key).start.getTime() + days * 86400000)); }
  function week(key) {
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    const monday = shift(key, -((weekday + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => shift(monday, index));
  }
  function normalize(doc) {
    const value = doc.data();
    const raw = value.timestamp;
    const date = raw?.toDate ? raw.toDate() : typeof raw === 'number' ? new Date(raw > 1e10 ? raw : raw * 1000) : new Date(raw);
    if (raw == null || value.temperatura == null || value.umidade == null) return null;
    const temp = Number(value.temperatura), hum = Number(value.umidade);
    return Number.isFinite(temp) && Number.isFinite(hum) && Number.isFinite(date.getTime()) ? { id: doc.id, temp, hum, date } : null;
  }
  function combine(groups, key) {
    const entries = new Map();
    for (const docs of groups) for (const doc of docs) {
      const item = normalize(doc);
      if (item && dayKey(item.date) === key) entries.set(item.id, item);
    }
    return [...entries.values()].sort((a, b) => b.date - a.date || a.id.localeCompare(b.id));
  }
  function create({ db, firebase, comfortScore, fireRisk }) {
    const el = id => document.getElementById(id);
    const label = (key, options) => bounds(key).start.toLocaleDateString('pt-BR', { timeZone: ZONE, ...options });
    const dateTime = date => date.toLocaleString('pt-BR', { timeZone: ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let selected = dayKey(), active = false, loading = true, failed = false, cached = false;
    let records = [], unsubscribers = [], generation = 0, visibleRows = 100;
    const more = document.createElement('button');
    more.type = 'button'; more.className = 'outline-button hidden'; more.id = 'historyMore'; more.textContent = 'Carregar mais leituras';
    el('dataTable').closest('.table-panel').append(more);
    more.addEventListener('click', () => { visibleRows += 100; render(); });
    function stop() { generation++; unsubscribers.forEach(unsubscribe => unsubscribe()); unsubscribers = []; }
    function filtered() {
      const query = el('searchInput').value.trim().toLowerCase();
      return records.filter(item => dateTime(item.date).toLowerCase().includes(query));
    }
    function renderWeek() {
      el('historyDate').value = selected;
      const keys = week(selected);
      el('weekLabel').textContent = `${label(keys[0], { day: '2-digit', month: 'short' })} — ${label(keys[6], { day: '2-digit', month: 'short', year: 'numeric' })}`;
      el('weekDays').replaceChildren(...keys.map(key => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'week-day'; button.setAttribute('aria-pressed', String(key === selected));
        button.setAttribute('aria-label', label(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        if (key === dayKey()) button.setAttribute('aria-current', 'date');
        const name = document.createElement('span'), number = document.createElement('strong'), today = document.createElement('small');
        name.textContent = label(key, { weekday: 'short' }).replace('.', '');
        number.textContent = label(key, { day: '2-digit' });
        today.textContent = key === dayKey() ? 'Hoje' : label(key, { month: 'short' });
        button.append(name, number, today); button.addEventListener('click', () => select(key));
        return button;
      }));
    }
    function render() {
      const items = filtered();
      el('exportButton').disabled = loading || failed || !items.length;
      el('historyRetry').classList.toggle('hidden', !failed);
      more.classList.toggle('hidden', loading || failed || items.length <= visibleRows);
      if (loading || failed) {
        el('tableSummary').textContent = loading ? 'Buscando leituras do dia…' : 'Consulta indisponível';
        el('dataTable').innerHTML = `<tr><td colspan="5" class="empty-state">${loading ? 'Carregando o histórico selecionado…' : 'Não foi possível consultar esta data. Tente novamente.'}</td></tr>`;
        for (const id of ['dayCount', 'dayTemperature', 'dayRange', 'dayHumidity']) el(id).textContent = '—';
        el('historyStatus').textContent = loading ? 'Consultando o dia no Firebase…' : 'Falha na consulta. Verifique a conexão e a permissão de leitura do histórico.';
        return;
      }
      el('dayCount').textContent = records.length;
      const total = records.reduce((sum, item) => ({ temp: sum.temp + item.temp, hum: sum.hum + item.hum, min: Math.min(sum.min, item.temp), max: Math.max(sum.max, item.temp) }), { temp: 0, hum: 0, min: Infinity, max: -Infinity });
      const decimal = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      el('dayTemperature').textContent = records.length ? `${decimal(total.temp / records.length)} °C` : '—';
      el('dayHumidity').textContent = records.length ? `${decimal(total.hum / records.length)} %` : '—';
      el('dayRange').textContent = records.length ? `${decimal(total.min)}° / ${decimal(total.max)}°` : '—';
      el('historyStatus').textContent = cached ? 'Dados em cache: podem estar incompletos. Aguardando confirmação do Firebase.' : `${label(selected, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · ${records.length ? 'Histórico do dia atualizado.' : 'Nenhuma leitura registrada neste dia.'}`;
      el('tableSummary').textContent = `${items.length} ${items.length === 1 ? 'leitura disponível' : 'leituras disponíveis'}${items.length > visibleRows ? ` · exibindo ${visibleRows}` : ''}`;
      el('dataTable').innerHTML = items.slice(0, visibleRows).map(item => {
        const risk = fireRisk(item.temp, item.hum);
        return `<tr><td>${dateTime(item.date)}</td><td><strong>${decimal(item.temp)}°C</strong></td><td>${decimal(item.hum)}%</td><td>${comfortScore(item.temp, item.hum)}/100</td><td><span class="table-risk ${risk.className}">${risk.label}</span></td></tr>`;
      }).join('') || `<tr><td colspan="5" class="empty-state">${records.length ? 'Nenhuma leitura corresponde à busca neste dia.' : cached ? 'Aguardando conexão para confirmar os registros deste dia.' : 'Nenhuma leitura registrada neste dia. Escolha outra data.'}</td></tr>`;
    }
    function subscribe() {
      stop();
      const current = generation;
      loading = true; failed = false; records = []; visibleRows = 100; render();
      const { start, end } = bounds(selected);
      // Existing firmware may write Firestore Timestamp, Unix seconds/milliseconds or ISO strings.
      // Query each type independently; no 100-record dashboard limit applies here.
      const ranges = [
        [firebase.firestore.Timestamp.fromDate(start), firebase.firestore.Timestamp.fromDate(end)],
        [start.getTime(), end.getTime()], [start.getTime() / 1000, end.getTime() / 1000],
        [shift(selected, -1), shift(selected, 2)]
      ];
      const groups = new Array(ranges.length), sources = new Array(ranges.length);
      ranges.forEach(([from, to], index) => {
        const unsubscribe = db.collection('leituras').where('timestamp', '>=', from).where('timestamp', '<', to).orderBy('timestamp', 'desc').onSnapshot({ includeMetadataChanges: true }, snapshot => {
          if (generation !== current || failed) return;
          groups[index] = snapshot.docs; sources[index] = snapshot.metadata.fromCache;
          if (groups.filter(Boolean).length !== ranges.length) return;
          records = combine(groups, selected); cached = sources.some(Boolean); loading = false; render();
        }, () => {
          if (generation !== current) return;
          loading = false; failed = true; records = []; render(); stop();
        });
        unsubscribers.push(unsubscribe);
      });
    }
    function select(key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(bounds(key).start.getTime())) return;
      selected = key; el('searchInput').value = ''; renderWeek();
      if (active) subscribe();
    }
    el('historyDate').addEventListener('change', event => select(event.target.value));
    el('previousWeek').addEventListener('click', () => select(shift(selected, -7)));
    el('nextWeek').addEventListener('click', () => select(shift(selected, 7)));
    el('historyToday').addEventListener('click', () => select(dayKey()));
    el('historyRetry').addEventListener('click', subscribe);
    renderWeek();
    return {
      render,
      setActive(value) { if (value === active) return; active = value; if (active) subscribe(); else stop(); },
      exportCsv() {
        const items = filtered();
        if (loading || failed || !items.length) return;
        const rows = [['data_hora_UTC-3', 'temperatura_c', 'umidade_percentual', 'conforto', 'risco'], ...items.map(item => [dateTime(item.date), item.temp.toFixed(1), item.hum.toFixed(1), comfortScore(item.temp, item.hum), fireRisk(item.temp, item.hum).label])];
        const blob = new Blob(['\uFEFF' + rows.map(row => row.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `leituras-${selected}.csv`; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
    };
  }
  const api = { dayKey, bounds, shift, week, combine, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StationHistory = api;
})(typeof window !== 'undefined' ? window : globalThis);


// Notificações push
const SitePush = (() => {
  const defaults = { minTemp: 18, maxTemp: 30, minHum: 30, maxHum: 70, heat: true, cold: true, humidity: true, recovery: true, offline: true };
  function create({ firebase, messaging, vapidKey }) {
    const el = id => document.getElementById(id);
    const auth = firebase.auth();
    let settings = { ...defaults }, registered = false, available = null, busy = false, refreshTimer;
    try { settings = { ...defaults, ...JSON.parse(localStorage.getItem('imnvlab-thresholds') || '{}'), ...JSON.parse(localStorage.getItem('imnvlab-push-settings') || '{}') }; } catch {}
    function syncLimits(){ thresholds = { ...settings }; localStorage.setItem('imnvlab-thresholds', JSON.stringify(thresholds)); if(latest) updateCurrent(); }
    syncLimits();
    let optedIn = localStorage.getItem('imnvlab-push-enabled') === 'true';
    const supported = !!messaging && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    // Callable protocol without the Functions SDK's implicit Messaging.getToken().
    // Only subscribe() obtains a push token, using our worker and VAPID key.
    async function call(name, data = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (name !== 'pushStatus' && auth.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken();
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(`https://southamerica-east1-${firebase.app().options.projectId}.cloudfunctions.net/${name}`, {
          method: 'POST', headers, body: JSON.stringify({ data }), signal: controller.signal
        });
        const body = await response.json();
        if (!response.ok || body.error) {
          const error = new Error('Falha na chamada do serviço');
          error.code = 'functions/' + (body.error?.status || 'unavailable').toLowerCase().replaceAll('_', '-');
          throw error;
        }
        return body.result ?? body.data;
      } finally { clearTimeout(timer); }
    }
    async function checkService() {
      try { available = (await call('pushStatus'))?.available === true; }
      catch (error) { available = false; throw error; }
      if (!available) throw new Error('service-unavailable');
    }
    const feedback = text => { el('pushFeedback').textContent = text; };
    function render() {
      const permission = 'Notification' in window ? Notification.permission : 'unsupported';
      el('pushStatus').textContent = !supported ? 'Não disponível neste navegador' : registered ? '● Ativo neste dispositivo' : permission === 'denied' ? 'Permissão bloqueada' : '○ Desativado neste dispositivo';
      el('pushServiceStatus').textContent = available === null ? 'Verificando serviço automático…' : available ? 'Serviço automático disponível' : 'Não foi possível acessar o serviço automático';
      el('pushEnable').disabled = busy || !supported || registered;
      el('pushDisable').disabled = busy || !optedIn;
      el('pushTest').disabled = busy || !registered;
      el('pushSave').disabled = busy;
      el('notifyButton').innerHTML = interfaceIcon('bell') + ' Notificações';
      el('pushEnable').hidden = registered;
      el('pushTest').hidden = !registered;
      el('pushDisable').hidden = !optedIn;
      el('notifyButton').disabled = busy;
    }
    async function registration() {
      await navigator.serviceWorker.register('./service-worker.js');
      return Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('service-worker-timeout')), 15000); navigator.serviceWorker.ready.then(() => clearTimeout(timer)); })]);
    }
    async function subscribe() {
      await checkService();
      if (!auth.currentUser) await auth.signInAnonymously();
      const worker = await registration();
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: worker });
      if (!token) throw new Error('missing-token');
      await call('registerPush', { token, settings });
      registered = true; optedIn = true;
      localStorage.setItem('imnvlab-push-enabled', 'true');
      localStorage.setItem('imnvlab-push-settings', JSON.stringify(settings));
    }
    function errorText(error) {
      if (error.code?.startsWith('auth/')) return 'O Firebase Authentication precisa permitir acesso anônimo para cadastrar este dispositivo. Nenhum login pessoal é necessário.';
      if (error.code === 'functions/invalid-argument') return 'Confira os limites: a mínima precisa ser menor que a máxima, e a umidade deve ficar entre 0 e 100%.';
      if (error.code === 'functions/resource-exhausted') return 'Aguarde um minuto antes de testar novamente.';
      if (error.code === 'messaging/permission-blocked' || error.name === 'NotAllowedError') return 'O navegador bloqueou o push. Permita notificações nas configurações deste site e tente novamente.';
      if (error.code === 'messaging/failed-service-worker-registration' || error.message === 'service-worker-timeout') return 'Não foi possível iniciar as notificações em segundo plano. Atualize a página e tente novamente. Código: ' + (error.code || 'service-worker-timeout');
      if (error.code?.startsWith('messaging/') || error.name === 'AbortError' || error.name === 'InvalidStateError') return 'O cadastro de notificações não foi concluído neste navegador. Tente novamente; se persistir, informe este código: ' + (error.code || error.name) + '.';
      return 'Não foi possível concluir. Verifique a conexão e se o serviço de push foi publicado no Firebase. Nenhuma ativação foi confirmada.';
    }
    async function enable() {
      location.hash = '#alertas';
      if (!supported) { feedback('Use um navegador compatível e um endereço HTTPS. No iPhone/iPad, adicione o site à Tela de Início e abra por esse ícone.'); return; }
      if (Notification.permission === 'denied') { feedback('Libere as notificações nas configurações deste site no navegador e tente novamente.'); return; }
      if (registered) { feedback('As notificações já estão ativas neste dispositivo. Você pode enviar um teste abaixo.'); return; }
      busy = true; render();
      try {
        // The permission request stays directly inside the user's click gesture.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { feedback('Permissão não concedida. Você pode ativar quando quiser.'); return; }
        await subscribe(); feedback('Push ativado neste dispositivo. Use “Testar notificação” para conferir a entrega.');
      } catch (error) { registered = false; feedback(errorText(error)); }
      finally { busy = false; render(); }
    }
    async function disable() {
      busy = true; render();
      try {
        if (auth.currentUser) await call('disablePush');
        await messaging.deleteToken();
        registered = false; optedIn = false; localStorage.setItem('imnvlab-push-enabled', 'false');
        feedback('Push desativado neste dispositivo. Você pode reativar depois.');
      } catch { feedback('Não foi possível concluir a desativação. Verifique a conexão e tente novamente.'); }
      finally { busy = false; render(); }
    }
    for (const key of Object.keys(defaults)) {
      const input = el('push-' + key);
      if (typeof defaults[key] === 'boolean') input.checked = settings[key]; else input.value = settings[key];
    }
    el('pushForm').addEventListener('submit', async event => {
      event.preventDefault();
      const next = Object.fromEntries(Object.keys(defaults).map(key => [key, typeof defaults[key] === 'boolean' ? el('push-' + key).checked : Number(el('push-' + key).value)]));
      if (next.minTemp >= next.maxTemp || next.minHum >= next.maxHum) { feedback('A mínima precisa ser menor que a máxima.'); return; }
      const previous = settings; settings = next; busy = true; render();
      try {
        if (registered) await subscribe();
        localStorage.setItem('imnvlab-push-settings', JSON.stringify(settings));
        syncLimits();
        feedback(registered ? 'Limites salvos para o painel e as notificações.' : 'Limites salvos no painel. Ative as notificações para receber os mesmos avisos neste aparelho.');
      } catch (error) { settings = previous; feedback(errorText(error)); }
      finally { busy = false; render(); }
    });
    el('pushEnable').addEventListener('click', enable);
    el('pushDisable').addEventListener('click', disable);
    el('pushTest').addEventListener('click', async () => {
      busy = true; render();
      try { await call('testPush'); feedback('Teste aceito pelo Firebase. Confira a notificação neste dispositivo.'); }
      catch (error) { feedback(errorText(error)); }
      finally { busy = false; render(); }
    });
    // Only the service worker displays messages, including those received with a tab in front.
    // This avoids the old duplicate local alerts and supports mobile browsers.
    if (messaging) messaging.onMessage(async payload => {
      if (!optedIn || Notification.permission !== 'granted') return;
      try { const worker = await registration(); worker.active?.postMessage({ type: 'IMNV_PUSH', payload }); } catch {}
    });
    async function restore() {
      if (!supported || busy) return;
      busy = true; render();
      try {
        await checkService();
        if (optedIn && Notification.permission === 'granted') { await subscribe(); feedback('Push ativo. As preferências são específicas deste dispositivo.'); }
        else if (optedIn && auth.currentUser) { await call('disablePush'); registered = false; optedIn = false; localStorage.setItem('imnvlab-push-enabled', 'false'); }
      } catch (error) { registered = false; feedback(errorText(error)); }
      finally { busy = false; render(); }
    }
    auth.onAuthStateChanged(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(restore, 0); });
    window.addEventListener('online', restore);
    render();
    return { enable };
  }
  return { create };
})();


// Painel da estação
const firebaseConfig = { apiKey: "AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM", authDomain: "climat-7c7f7.firebaseapp.com", projectId: "climat-7c7f7", storageBucket: "climat-7c7f7.firebasestorage.app", messagingSenderId: "267164246485", appId: "1:267164246485:web:a72b776b880ba5b8b71d5c" };

// Chave pública conferida no Firebase Console em 05/09/2026.
const VAPID_KEY = 'BNEXQLVGXD7XSZ3dsOln7xqJkgqxDpb5OxwLv54CrQnYjEjvwq4zEUhFly4V2rh7i2MQYFDYU19GDyRPZgojIas';

const MAX_POINTS = 20;
const SENSOR_TIMEOUT_MS = 120000;
let readings = [], latest = null, historyChart, analysisChart, regionalMap, locationMarker, lastAlertSignature = '', offlineNotified = false, locationWatchId = null, lastReadingAt = null, sensorOfflineNotified = false;
let thresholds = JSON.parse(localStorage.getItem('imnvlab-thresholds') || '{"maxTemp":30,"minHum":30,"maxHum":70}');
let messaging = null;

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('Firebase Messaging não disponível neste navegador:', e);
}

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const formatTime = date => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const formatDate = date => date.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function updateDayNight(){
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const night = hour < 6 || hour >= 18;
  document.body.classList.toggle('night-mode', night);
  $('#weatherIcon').textContent = night ? '☾' : '☼';
  $('#currentDateLabel').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function readingDate(value){
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value > 10000000000 ? value : value * 1000);
  return value ? new Date(value) : new Date();
}

function isSensorOnline(){
  return lastReadingAt instanceof Date && Date.now() - lastReadingAt.getTime() <= SENSOR_TIMEOUT_MS;
}

function updateSensorStatus(){
  if (!latest || !isSensorOnline()) {
    $('#statusText').textContent = 'Arduino offline';
    $('#connPill').innerHTML = '<i></i> Arduino offline';
    $('#statusDot').style.background = 'var(--coral)';
    $('#stationState').textContent = 'OFFLINE';
    $('#stationState').style.color = 'var(--coral)';
    $('#alertHeadline').textContent = 'Arduino sem enviar dados';
    $('#alertBadge').textContent = '1';
    $('#alertCount').textContent = '1';
    $('#alertList').innerHTML = '<div class="alert-item"><span class="alert-symbol">!</span><div><strong>Arduino offline</strong><small>Nenhuma leitura nova há mais de 2 minutos.</small></div><span class="alert-time">agora</span></div>';
    sensorOfflineNotified = true;
    return false;
  }
  sensorOfflineNotified = false;
  $('#statusText').textContent = 'Estação online';
  $('#connPill').innerHTML = '<i></i> conectado';
  $('#statusDot').style.background = 'var(--teal)';
  $('#stationState').textContent = 'ONLINE';
  $('#stationState').style.color = 'var(--teal)';
  updateAlerts();
  return true;
}

function setupRegionalMap(){
  const mapElement = $('.map-placeholder');
  if (!window.L || !mapElement) return;
  mapElement.innerHTML = '';
  regionalMap = L.map(mapElement).setView([-8.11, -42.94], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(regionalMap);
  locationMarker = L.circleMarker([-8.11, -42.94], { radius: 8, color: '#995bff', fillColor: '#995bff', fillOpacity: .9 }).addTo(regionalMap);
  locationMarker.bindPopup('<strong>Canto do Buriti</strong><br>-8.11, -42.94');
}

function updateDeviceLocation(position){
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  $('#deviceCoordinates').textContent = `GPS · ${coordinates}`;
  $('#locationButton').textContent = '⌖ GPS atualizado';
  $('#locationButtonTop').textContent = '⌖ GPS atualizado';
  if (regionalMap) {
    regionalMap.setView([latitude, longitude], 12);
    if (locationMarker) locationMarker.setLatLng([latitude, longitude]);
    else locationMarker = L.circleMarker([latitude, longitude], { radius: 8, color: '#995bff', fillColor: '#995bff', fillOpacity: .9 }).addTo(regionalMap);
    locationMarker.bindPopup('Sua localização atual');
  }
  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`)
    .then(response => response.json())
    .then(data => {
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality || 'Localização atual';
      const state = address.state_code || address.state || '';
      $('#deviceLocation').textContent = city;
      $('#deviceCoordinates').textContent = `${state ? `${state} · ` : ''}${coordinates}`;
      if (locationMarker) locationMarker.bindPopup(`<strong>${city}</strong><br>${coordinates}`);
    })
    .catch(() => { $('#deviceLocation').textContent = 'Localização atual'; });
}

function handleLocationError(error){
  const messages = { 1: 'Permissão de localização negada', 2: 'Localização indisponível', 3: 'Tempo esgotado ao localizar' };
  if (error.code === 1) locationWatchId = null;
  $('#deviceLocation').textContent = 'Canto do Buriti';
  $('#deviceCoordinates').textContent = `GPS · ${messages[error.code] || 'indisponível'}`;
  $('#locationButton').textContent = '⌖ Tentar localização';
  $('#locationButtonTop').textContent = '⌖ Tentar localização';
}

function startLocationTracking(){
  if (!('geolocation' in navigator)) return handleLocationError({ code: 2 });
  if (locationWatchId !== null) return;
  const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
  locationWatchId = navigator.geolocation.watchPosition(updateDeviceLocation, handleLocationError, options);
}

function comfortScore(temp, hum){
  let score = 100;
  if (temp < 18 || temp > 30) score -= 35;
  else if (temp < 20 || temp > 26) score -= 15;
  if (hum < 30 || hum > 70) score -= 35;
  else if (hum < 40 || hum > 60) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function fireRisk(temp, hum){
  if (temp > 32 && hum < 30) return { label: 'alto', className: 'high' };
  if (temp > 29 || hum < 40) return { label: 'moderado', className: 'medium' };
  return { label: 'baixo', className: 'low' };
}

function setupCharts(){
  const config = {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Temperatura °C', data: [], borderColor: '#995bff', backgroundColor: 'rgba(153,91,255,.1)', tension: .35, pointRadius: 2, yAxisID: 'temp' },
        { label: 'Umidade %', data: [], borderColor: '#339bef', backgroundColor: 'rgba(76,154,145,.1)', tension: .35, pointRadius: 2, yAxisID: 'hum' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#9ba8c3', boxWidth: 10, font: { family: 'DM Sans', size: 10 } } } },
      scales: {
        x: { ticks: { color: '#9ba8c3' }, grid: { color: '#1a2540' } },
        temp: { position: 'left', ticks: { color: '#995bff' }, grid: { color: '#1a2540' } },
        hum: { position: 'right', ticks: { color: '#339bef' }, grid: { display: false } }
      }
    }
  };
  historyChart = new Chart($('#historyChart'), config);
  analysisChart = new Chart($('#analysisChart'), { ...config, data: { labels: [], datasets: [config.data.datasets[0]] } });
}

function updateCharts(){
  const ordered = readings.slice(0, MAX_POINTS).reverse();
  const labels = ordered.map(item => formatTime(item.date));
  const temps = ordered.map(item => item.temp);
  const hums = ordered.map(item => item.hum);
  historyChart.data.labels = labels;
  historyChart.data.datasets[0].data = temps;
  historyChart.data.datasets[1].data = hums;
  historyChart.update();
  analysisChart.data.labels = labels;
  analysisChart.data.datasets[0].data = temps;
  analysisChart.update();
}

function updateCurrent(){
  if (!latest) return;
  const { temp, hum, date } = latest;
  const comfort = comfortScore(temp, hum);
  const risk = fireRisk(temp, hum);
  $('#heroTemp').innerHTML = `${temp.toFixed(1)}<sup>°C</sup>`;
  $('#heroHum').textContent = `${Math.round(hum)}%`;
  $('#heroComfort').textContent = `${comfort}/100`;
  $('#heroFire').textContent = risk.label;
  $('#tempValue').textContent = temp.toFixed(1);
  $('#humValue').textContent = Math.round(hum);
  $('#comfortValue').textContent = comfort;
  $('#comfortTag').textContent = comfort >= 75 ? 'bom para permanecer' : comfort >= 50 ? 'moderado hoje' : 'fora da faixa ideal';
  $('#stationState').textContent = 'ONLINE';
  $('#heroCondition').textContent = comfort >= 75 ? 'Condições agradáveis no momento' : 'Condições pedem atenção';
  $('#fireRiskLabel').textContent = risk.label;
  $('#fireRiskLabel').className = risk.className;
  $('#updatedLabel').textContent = `atualizado às ${formatTime(date)}`;
  $('#lastUpdate').textContent = formatTime(date);
  $('#statusText').textContent = 'Estação online';
  $('#statusDot').style.background = 'var(--teal)';
  $('#connPill').innerHTML = '<i></i> conectado';
  $('#analysisTitle').textContent = comfort >= 75 ? 'Ambiente confortável' : comfort >= 50 ? 'Ambiente moderado' : 'Ambiente desconfortável';
  $('#analysisText').textContent = `A temperatura está em ${temp.toFixed(1)}°C e a umidade em ${Math.round(hum)}%.`;
  $('#tempDelta').textContent = temp > 30 ? 'acima do ideal' : 'faixa observada';
  $('#humDelta').textContent = hum > 70 || hum < 30 ? 'fora do ideal' : 'faixa observada';
  updateAlerts();
  updateStats();
  updateTable();
  updateSensorStatus();
  updateOverview();
}

function updateAlerts(){
  const alerts = [];
  if (thresholds.heat !== false && latest.temp > thresholds.maxTemp) alerts.push(['thermometer', 'Temperatura acima do limite', `Acima de ${thresholds.maxTemp}°C`]);
  if (thresholds.humidity !== false && latest.hum > thresholds.maxHum) alerts.push(['drop', 'Umidade acima do limite', `Acima de ${thresholds.maxHum}%`]);
  if (thresholds.humidity !== false && latest.hum < thresholds.minHum) alerts.push(['drop', 'Umidade abaixo do limite', `Abaixo de ${thresholds.minHum}%`]);
  if (thresholds.cold !== false && latest.temp < (thresholds.minTemp ?? 18)) alerts.push(['snow', 'Temperatura baixa', `Ambiente abaixo de ${thresholds.minTemp ?? 18}°C`]);
  const signature = alerts.map(alert => alert[1]).join('|');
  lastAlertSignature = signature;
  $('#alertCount').textContent = alerts.length;
  $('#alertBadge').textContent = alerts.length;
  $('#alertHeadline').textContent = alerts.length ? `${alerts.length} ponto${alerts.length > 1 ? 's' : ''} pede atenção` : 'Tudo sob controle';
  $('#alertList').innerHTML = alerts.length
    ? alerts.map(alert => `<div class="alert-item"><span class="alert-symbol">${interfaceIcon(alert[0])}</span><div><strong>${alert[1]}</strong><small>${alert[2]}</small></div><span class="alert-time">agora</span></div>`).join('')
    : '<div class="empty-state">Nenhum alerta no momento.</div>';
}

function updateOverview(){
  if (!latest) return;
  const online = isSensorOnline();
  const comfort = comfortScore(latest.temp, latest.hum);
  document.querySelector('#overviewRecommendationTitle').textContent = online ? (comfort >= 75 ? 'Ambiente agradável' : 'Atenção às condições') : 'Estação sem leituras recentes';
  document.querySelector('#overviewRecommendation').textContent = online ? (comfort >= 75 ? 'As condições atuais estão adequadas. Continue acompanhando as próximas medições.' : 'Confira a central de alertas e acompanhe as próximas medições.') : 'Verifique a alimentação e a conexão da estação.';
  document.querySelector('#overviewAlerts').innerHTML = document.querySelector('#alertList').innerHTML;
  document.querySelector('#connPill').classList.toggle('is-offline', !online);
  document.querySelector('#comfortValue').closest('.metric-card').style.setProperty('--comfort', comfort + '%');
}

function updateStats(){
  const temps = readings.map(item => item.temp);
  const hums = readings.map(item => item.hum);
  if (!temps.length) return;
  const max = readings.reduce((a, b) => a.temp > b.temp ? a : b);
  $('#avgTemp').textContent = `${(temps.reduce((a,b) => a+b, 0) / temps.length).toFixed(1)}°C`;
  $('#avgHum').textContent = `${Math.round(hums.reduce((a,b) => a+b, 0) / hums.length)}%`;
  $('#maxTemp').textContent = `${max.temp.toFixed(1)}°C`;
  $('#maxTempTime').textContent = formatDate(max.date);
  $('#validReadings').textContent = readings.length;
  $('#dailyTitle').textContent = temps[temps.length - 1] > temps[0] ? 'O dia está aquecendo' : 'Temperatura estável';
  $('#dailyText').textContent = `A média observada foi de ${(temps.reduce((a,b) => a+b, 0) / temps.length).toFixed(1)}°C, com umidade média de ${Math.round(hums.reduce((a,b) => a+b, 0) / hums.length)}%.`;
  $('#dailyRecommendation').textContent = latest.hum < 40
    ? 'Priorize ventilação e hidratação durante os períodos mais quentes.'
    : 'As condições permitem seguir com as atividades habituais, mantendo o acompanhamento.';
}

let dayHistory;
function updateTable(){ dayHistory?.render(); }
function exportCsv(){ dayHistory?.exportCsv(); }

function navigate(){
  const view = (location.hash || '#dashboard').slice(1);
  const valid = ['dashboard','dados','alertas','analises','sobre'];
  const active = valid.includes(view) ? view : 'dashboard';
  $$('.page').forEach(page => page.classList.toggle('hidden', page.dataset.view !== active));
  $$('nav a[data-page]').forEach(link => { link.classList.toggle('active', link.dataset.page === active); if(link.dataset.page === active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  $('#menuBackdrop').hidden = true;
  $('.sidebar').classList.remove('mobile-open');

  dayHistory?.setActive(active === 'dados');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let pushController;
function enableNotifications(){ return pushController.enable(); }

function showOffline(){
  $('#statusText').textContent = 'Estação offline';
  $('#connPill').innerHTML = '<i></i> sem conexão';
  $('#statusDot').style.background = 'var(--coral)';
  $('#stationState').textContent = 'OFFLINE';
  $('#stationState').style.color = 'var(--coral)';
  $('#alertHeadline').textContent = 'Estação sem conexão';
  $('#alertBadge').textContent = '1';
  $('#alertCount').textContent = '1';
  $('#alertList').innerHTML = '<div class="alert-item"><span class="alert-symbol">!</span><div><strong>Estação offline</strong><small>Não foi possível receber dados do Firestore.</small></div><span class="alert-time">agora</span></div>';
  offlineNotified = true;
}

function showConnecting(){
  $('#statusText').textContent = 'Reconectando...';
  $('#connPill').innerHTML = '<i></i> reconectando';
  $('#statusDot').style.background = 'var(--yellow)';
}

function start(){
  dayHistory = StationHistory.create({ db, firebase, comfortScore, fireRisk });
  setupCharts();
  setupRegionalMap();
  updateDayNight();
  setInterval(() => { updateDayNight(); if (latest) { updateSensorStatus(); updateOverview(); } }, 15000);
  window.addEventListener('hashchange', navigate);
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showConnecting);
  navigate();
  startLocationTracking();
  $('#locationButton').addEventListener('click', startLocationTracking);
  $('#locationButtonTop').addEventListener('click', startLocationTracking);
  $('#exportButton').addEventListener('click', exportCsv);
  $('#searchInput').addEventListener('input', updateTable);
  $('#runAnalysisButton').addEventListener('click', updateStats);
  $('#notifyButton').addEventListener('click', () => { location.hash = '#alertas'; });

  pushController = SitePush.create({ firebase, messaging, vapidKey: VAPID_KEY });

  db.collection('leituras').orderBy('timestamp', 'desc').limit(100).onSnapshot(snapshot => {
    offlineNotified = false;
    readings = snapshot.docs.map(doc => {
      const data = doc.data();
      return { temp: Number(data.temperatura), hum: Number(data.umidade), date: readingDate(data.timestamp) };
    }).filter(item => Number.isFinite(item.temp) && Number.isFinite(item.hum));
    latest = readings[0];
    lastReadingAt = latest?.date || null;
    if (latest) {
      updateCharts();
      updateCurrent();
    }
  }, showOffline);
}

start();
// Lumi: navegação e respostas locais baseadas nas leituras da estação.
(function setupGuide(){
 const el=id=>document.getElementById(id), panel=el('guidePanel'), toggle=el('guideToggle'), field=el('guideText'), listen=el('guideListen');
 const normalize=text=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const dateKey=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const descriptions={dashboard:'No início você encontra temperatura, umidade e conforto. Os valores são da última medição, cujo horário aparece no painel.',dados:'Em Dados, escolha um dia da semana ou uma data. Você pode buscar um horário e exportar as medições.',alertas:'Alertas mostra o que precisa de atenção. Ativar notificações permite receber avisos neste aparelho. Em Escolher alertas e limites você personaliza esses avisos.',analises:'Análises resume as leituras recentes disponíveis de hoje. As médias podem não representar o dia inteiro.',sobre:'A estação usa um sensor para medir temperatura e umidade. O ESP32 envia as leituras pela internet para o site.'};
 let recognition=null, timer, session=0;
 function stopListening(){session++;clearTimeout(timer);const old=recognition;recognition=null;if(old){old.onend=old.onerror=old.onresult=null;try{old.abort();}catch{}}listen.textContent=Recognition?'Falar com Lumi':'Voz indisponível';}
 function answer(text,read=true){el('guideReply').textContent=text;window.speechSynthesis?.cancel();if(read&&el('guideSpeak').checked&&'speechSynthesis' in window){stopListening();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='pt-BR';speechSynthesis.speak(utterance);}}
 function close(){stopListening();window.speechSynthesis?.cancel();panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 function measurement(text){
  if(/amanha|previsao/.test(text)){answer('A estação mede o ambiente; não tenho previsão do tempo para amanhã. Posso informar a última leitura de hoje.');return;}
  if(/ontem|semana|\d{1,2}[/-]\d/.test(text)){answer('Para outra data, consulte Dados. Posso abrir “dados de ontem”. Aqui respondo sobre as leituras recentes de hoje.');return;}
  const today=readings.filter(r=>Number.isFinite(r.date?.getTime())&&dateKey(r.date)===dateKey(new Date())&&r.date.getTime()<=Date.now()+30000).sort((a,b)=>b.date-a.date);
  if(!today.length){answer('Ainda não tenho medições de hoje disponíveis. Não vou usar uma leitura antiga como se fosse atual. Consulte Dados ou aguarde a estação.');return;}
  const current=today[0], time=current.date.toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'}), fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1});
  const temperature=/temperatura|graus|calor|frio/.test(text), humidity=/umidade/.test(text), comfort=/confort/.test(text);
  let result;
  if(/media|maxima|minima|maior|menor/.test(text)){
   if(comfort){answer('Posso informar o conforto da última leitura. Para médias, pergunte sobre temperatura ou umidade.');return;}
   const summarize=(key,label,unit)=>{const values=today.map(r=>r[key]);const value=/maxima|maior/.test(text)?Math.max(...values):/minima|menor/.test(text)?Math.min(...values):values.reduce((a,b)=>a+b,0)/values.length;return `${label}: ${fmt(value)} ${unit}`;};
   result=[temperature?summarize('temp','Temperatura','°C'):null,humidity?summarize('hum','Umidade','%'):null].filter(Boolean).join('. ')+`. Cálculo sobre ${today.length} leituras recentes de hoje carregadas no painel, não necessariamente o dia inteiro.`;
  }else result=`Na última leitura de hoje, às ${time} (horário da estação): `+[temperature?`temperatura de ${fmt(current.temp)} °C`:null,humidity?`umidade de ${fmt(current.hum)}%`:null,comfort?`conforto de ${comfortScore(current.temp,current.hum)}/100`:null].filter(Boolean).join('; ')+'.';
  if(Date.now()-current.date.getTime()>SENSOR_TIMEOUT_MS)result+=' A estação está sem leitura recente; esses valores não confirmam as condições de agora.';
  answer(result);
 }
 function command(raw){
  stopListening();const text=normalize(raw);
  if(!text){answer('Digite uma pergunta ou toque em Falar com Lumi.');return;}
  if(/\b(nao|cancele|cancelar|pare|parar)\b/.test(text)){answer('Tudo bem. Não vou navegar.');return;}
  const pages=[[/\b(inicio|dashboard|principal)\b/,'dashboard'],[/\b(dados|historico)\b/,'dados'],[/alert|notifica/,'alertas'],[/analis/,'analises'],[/\bsobre\b|como funciona a estacao/,'sobre']].filter(([pattern])=>pattern.test(text)).map(([,page])=>page);
  const explain=/explic|como funciona|o que (e|sao)|ajud/.test(text), navigation=/\b(abrir|abra|abre|ir|va|ver|mostrar|mostre|consultar|leve)\b/.test(text);
  if(pages.length>1){answer('Você quer Início, Dados, Alertas, Análises ou Sobre? Escolha uma página por vez.');return;}
  if(explain){answer(descriptions[pages[0]||location.hash.slice(1)]||descriptions.dashboard);return;}
  if(/temperatura|graus|umidade|conforto|calor|frio/.test(text)&&!navigation){measurement(text);return;}
  const page=pages[0];
  if(!page||(!navigation&&!/^(inicio|dashboard|dados( de (ontem|hoje))?|historico|alertas|analises|sobre)[.!?]*$/.test(text))){answer('Você quer abrir uma página ou fazer uma pergunta? Experimente “abrir alertas”, “explique os alertas” ou “qual a temperatura de hoje?”.');return;}
  location.hash='#'+page;navigate();
  if(page==='dados'&&/ontem|hoje/.test(text)){const day=new Date(dateKey(new Date())+'T12:00:00-03:00');if(text.includes('ontem'))day.setUTCDate(day.getUTCDate()-1);el('historyDate').value=dateKey(day);el('historyDate').dispatchEvent(new Event('change',{bubbles:true}));}
  answer('Pronto. '+descriptions[page]);
 }
 toggle.addEventListener('click',()=>{if(!panel.hidden)return close();panel.hidden=false;toggle.setAttribute('aria-expanded','true');field.focus();});el('guideClose').addEventListener('click',close);
 el('guideForm').addEventListener('submit',event=>{event.preventDefault();command(field.value);});document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.guide)));
 el('guideSpeak').addEventListener('change',()=>{if(!el('guideSpeak').checked)window.speechSynthesis?.cancel();});
 if(!Recognition){listen.disabled=true;listen.textContent='Voz indisponível';}
 else listen.addEventListener('click',()=>{
  if(recognition){stopListening();answer('Escuta cancelada.',false);return;}
  window.speechSynthesis?.cancel();const id=++session;recognition=new Recognition();recognition.lang='pt-BR';recognition.continuous=false;recognition.interimResults=false;
  recognition.onresult=event=>{if(id!==session)return;const transcript=event.results[0][0].transcript;stopListening();field.value=transcript;answer('Ouvi: “'+transcript+'”. Corrija se precisar e toque em Enviar para confirmar.',false);field.focus();};
  recognition.onerror=event=>{if(id!==session)return;stopListening();answer(event.error==='not-allowed'?'O microfone foi bloqueado. Permita o acesso nas configurações do navegador ou digite sua pergunta.':'Não consegui reconhecer sua fala. Tente novamente ou digite a pergunta.',false);};
  recognition.onend=()=>{if(id!==session)return;stopListening();answer('Não recebi uma frase. Toque para tentar novamente ou digite.',false);};
  try{recognition.start();listen.textContent='Cancelar escuta';answer('Estou ouvindo. Você terá a chance de revisar a frase.',false);timer=setTimeout(()=>{if(id!==session)return;stopListening();answer('A escuta terminou após 12 segundos. Tente novamente ou digite.',false);},12000);}catch{stopListening();answer('Não foi possível iniciar o microfone. Digite sua pergunta ou tente novamente.',false);}
 });
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopListening();window.speechSynthesis?.cancel();}});
})();
