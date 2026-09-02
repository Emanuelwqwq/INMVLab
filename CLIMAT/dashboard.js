const firebaseConfig = {
  apiKey: "AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM",
  authDomain: "climat-7c7f7.firebaseapp.com",
  databaseURL: "https://climat-7c7f7-default-rtdb.firebaseio.com",
  projectId: "climat-7c7f7",
  storageBucket: "climat-7c7f7.firebasestorage.app",
  messagingSenderId: "267164246485",
  appId: "1:267164246485:web:a72b776b880ba5b8b71d5c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const TEMP_PATH = "temperatura";
const HUM_PATH = "umidade";
let lastTemp = null, lastHum = null;
let history = { labels: [], temp: [], hum: [] };
const MAX_POINTS = 20;
const ctx = document.getElementById('historyChart').getContext('2d');
const chart = new Chart(ctx, { type: 'line', data: { labels: history.labels, datasets: [
  { label: 'Temperatura °C', data: history.temp, borderColor: '#9b82ff', backgroundColor: 'rgba(155,130,255,.15)', tension: .35, pointRadius: 3, yAxisID: 'y' },
  { label: 'Umidade %', data: history.hum, borderColor: '#4fa3ff', backgroundColor: 'rgba(79,163,255,.15)', tension: .35, pointRadius: 3, yAxisID: 'y1' }
] }, options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#8791ac', boxWidth: 10, font: { size: 11 } } } }, scales: {
  x: { ticks: { color: '#8791ac', font: { size: 10 } }, grid: { color: '#262e47' } },
  y: { position: 'left', ticks: { color: '#8791ac', font: { size: 10 } }, grid: { color: '#262e47' } },
  y1: { position: 'right', ticks: { color: '#8791ac', font: { size: 10 } }, grid: { display: false } }
} } });

function fmtTime(){ return new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function computeComfort(t, h){ let score = 100; if (t < 18 || t > 30) score -= 35; else if (t < 20 || t > 26) score -= 15; if (h < 30 || h > 70) score -= 35; else if (h < 40 || h > 60) score -= 15; return Math.max(0, Math.min(100, score)); }
function updateComfortUI(score){ document.getElementById('comfortValue').textContent = score; document.getElementById('comfortBar').style.width = score + '%'; const tag = document.getElementById('comfortTag'); if (score >= 75){ tag.textContent = 'BOM'; tag.style.color = 'var(--green)'; } else if (score >= 50){ tag.textContent = 'MODERADO'; tag.style.color = 'var(--amber)'; } else { tag.textContent = 'RUIM'; tag.style.color = 'var(--red)'; } }
function updateAlerts(t, h){ const list = document.getElementById('alertList'); const items = []; if (h > 70) items.push({icon:'⚠️', title:'Umidade elevada', sub:'Acima da faixa confortável'}); if (h < 30) items.push({icon:'⚠️', title:'Umidade baixa', sub:'Abaixo da faixa confortável'}); if (t > 30) items.push({icon:'🔥', title:'Temperatura alta', sub:'Ambiente pode estar quente'}); if (t < 18) items.push({icon:'❄️', title:'Temperatura baixa', sub:'Ambiente pode estar frio'}); items.push({icon:'✅', title:'Sistema funcionando', sub:'ESP32 conectado'}); list.innerHTML = items.map(i => `<div class="alert-item"><div class="left"><span class="icon">${i.icon}</span><div><div class="a-title">${i.title}</div><div class="a-sub">${i.sub}</div></div></div><div class="time">Agora</div></div>`).join(''); const count = items.length - 1; document.getElementById('alertBadge').textContent = count; document.getElementById('alertCount').textContent = count; }
function updateRecommendation(t, h){ const title = document.getElementById('recoTitle'); const text = document.getElementById('recoText'); if (t >= 20 && t <= 26 && h >= 40 && h <= 60){ title.textContent = 'Ambiente agradável'; text.textContent = 'As condições atuais estão adequadas. Continue acompanhando as próximas medições.'; } else if (h > 70){ title.textContent = 'Umidade alta detectada'; text.textContent = 'Considere ventilar o ambiente ou usar um desumidificador.'; } else if (t > 30){ title.textContent = 'Temperatura elevada'; text.textContent = 'Considere ventilação ou climatização do ambiente.'; } else { title.textContent = 'Atenção às condições'; text.textContent = 'Os valores estão fora da faixa ideal de conforto.'; } }
function runAnalysis(){ if (lastTemp === null || lastHum === null) return; const box = document.getElementById('analysisBox'); const txt = document.getElementById('analysisText'); const comfort = computeComfort(lastTemp, lastHum); if (comfort >= 75){ box.firstChild.textContent = 'Ambiente confortável'; txt.textContent = `A temperatura de ${lastTemp}°C e a umidade de ${lastHum}% estão dentro de uma faixa confortável.`; } else if (comfort >= 50){ box.firstChild.textContent = 'Ambiente moderado'; txt.textContent = `Temperatura de ${lastTemp}°C e umidade de ${lastHum}% estão levemente fora do ideal.`; } else { box.firstChild.textContent = 'Ambiente desconfortável'; txt.textContent = `Temperatura de ${lastTemp}°C e umidade de ${lastHum}% estão fora da faixa recomendada.`; } }
function pushHistory(t, h){ history.labels.push(fmtTime()); history.temp.push(t); history.hum.push(h); if (history.labels.length > MAX_POINTS){ history.labels.shift(); history.temp.shift(); history.hum.shift(); } chart.update(); }
function handleReading(){ if (lastTemp === null || lastHum === null) return; document.getElementById('tempValue').textContent = lastTemp.toFixed(1); document.getElementById('humValue').textContent = Math.round(lastHum); document.getElementById('lastUpdate').textContent = fmtTime(); document.getElementById('fbCheck').textContent = '✓'; updateComfortUI(computeComfort(lastTemp, lastHum)); updateAlerts(lastTemp, lastHum); updateRecommendation(lastTemp, lastHum); pushHistory(lastTemp, lastHum); runAnalysis(); document.getElementById('connPill').innerHTML = '<span class="dot"></span> Sistema conectado'; document.getElementById('connPill').classList.remove('offline'); document.getElementById('statusDot').style.background = 'var(--green)'; document.getElementById('statusText').textContent = 'Estação online'; document.getElementById('stationState').textContent = 'ONLINE'; document.getElementById('stationState').style.color = 'var(--green)'; }
function showOffline(){ document.getElementById('connPill').innerHTML = '<span class="dot"></span> Sem conexão'; document.getElementById('connPill').classList.add('offline'); document.getElementById('statusDot').style.background = 'var(--red)'; document.getElementById('statusText').textContent = 'Estação offline'; document.getElementById('stationState').textContent = 'OFFLINE'; document.getElementById('stationState').style.color = 'var(--red)'; }
db.ref(TEMP_PATH).on('value', snap => { const v = snap.val(); if (v !== null){ lastTemp = parseFloat(v); handleReading(); } }, showOffline);
db.ref(HUM_PATH).on('value', snap => { const v = snap.val(); if (v !== null){ lastHum = parseFloat(v); handleReading(); } }, showOffline);