const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { randomUUID } = require('node:crypto');
const logic = (() => {
const DEFAULTS = Object.freeze({ maxTemp: 30, minTemp: 18, minHum: 30, maxHum: 70, heat: true, cold: true, humidity: true, recovery: true, offline: true });
function validate(input) {
  if (!input || typeof input.token !== 'string' || input.token.length < 20 || input.token.length > 4096) throw new Error('Token inválido');
  const settings = { ...DEFAULTS, ...input.settings };
  if (![settings.maxTemp, settings.minTemp, settings.minHum, settings.maxHum].every(Number.isFinite) || settings.minTemp < -40 || settings.maxTemp > 80 || settings.minTemp >= settings.maxTemp || settings.minHum < 0 || settings.maxHum > 100 || settings.minHum >= settings.maxHum) throw new Error('Limites inválidos');
  if (!['heat','cold','humidity','recovery','offline'].every(key => typeof settings[key] === 'boolean')) throw new Error('Preferências inválidas');
  return { token: input.token, settings: Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, settings[key]])) };
}
function reading(raw) {
  if (!raw || raw.temperatura == null || raw.umidade == null || raw.timestamp == null) return null;
  const temp = Number(raw.temperatura), hum = Number(raw.umidade), stamp = raw.timestamp;
  const at = stamp?.toMillis ? stamp.toMillis() : typeof stamp === 'number' ? (stamp > 1e10 ? stamp : stamp * 1000) : Date.parse(stamp);
  if (![temp, hum, at].every(Number.isFinite) || temp < -40 || temp > 80 || hum < 0 || hum > 100) return null;
  return { temp, hum, at };
}
function condition(value, settings, offline = false) {
  if (offline) return { signature: 'offline', enabled: settings.offline, title: 'IMNVLab · Estação offline', body: 'A estação está há mais de 2 minutos sem novas leituras. Verifique a conexão e a alimentação.' };
  const labels = [], keys = [], enabled = [];
  for (const [yes, key, text, allowed] of [
    [value.temp > settings.maxTemp, 'heat', 'Calor acima do limite', settings.heat],
    [value.temp < settings.minTemp, 'cold', 'Frio abaixo do limite', settings.cold],
    [value.hum < settings.minHum, 'dry', 'Umidade abaixo do limite', settings.humidity],
    [value.hum > settings.maxHum, 'wet', 'Umidade acima do limite', settings.humidity]
  ]) if (yes) { keys.push(key); if (allowed) { labels.push(text); enabled.push(key); } }
  const signature = keys.join('|') || 'normal';
  return { signature, enabled: enabled.length > 0 || signature === 'normal' && settings.recovery,
    title: signature === 'normal' ? 'IMNVLab · Ambiente na faixa configurada' : 'IMNVLab · Alerta ambiental',
    body: `${labels.join(' e ') || 'Condições dentro dos limites configurados'}. Temperatura: ${value.temp.toFixed(1).replace('.', ',')} °C. Umidade: ${Math.round(value.hum)}%.` };
}
function shouldSend(state, alert, now) {
  if (!alert.enabled) return false;
  if (alert.signature === 'normal') return !!state.alerted;
  return alert.signature !== state.lastSentSignature || now - (state.lastSentAt || 0) >= 3600000;
}
function message(token, alert, id) {
  // Data-only messages: the service worker displays exactly one notification.
  return { token, data: { title: alert.title, body: alert.body, id, tag: 'imnvlab-weather', url: 'index.html#alertas' }, webpush: { headers: { TTL: '300', Urgency: 'high' } } };
}
return { DEFAULTS, validate, reading, condition, shouldSend, message };

})();
initializeApp();
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 3 });
const db = getFirestore(), sender = getMessaging();
const deviceRef = uid => db.doc(`pushDevices/${uid}`);
const requireUser = request => { if (!request.auth) throw new HttpsError('unauthenticated', 'Ative o acesso anônimo no Firebase Authentication.'); return request.auth.uid; };
exports.pushStatus = onCall(async () => ({ available: true, version: 1 }));
exports.registerPush = onCall(async request => {
  const uid = requireUser(request);
  let input;
  try { input = logic.validate(request.data); } catch { throw new HttpsError('invalid-argument', 'Confira os limites dos alertas.'); }
  await deviceRef(uid).set({ ...input, enabled: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { registered: true };
});
exports.disablePush = onCall(async request => {
  await deviceRef(requireUser(request)).set({ enabled: false, token: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { disabled: true };
});
exports.testPush = onCall(async request => {
  const uid = requireUser(request), ref = deviceRef(uid);
  const device = await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (!current?.enabled || !current.token) throw new HttpsError('failed-precondition', 'Ative este dispositivo primeiro.');
    if (Date.now() - (current.lastTestAt || 0) < 60000) throw new HttpsError('resource-exhausted', 'Aguarde um minuto para testar novamente.');
    tx.update(ref, { lastTestAt: Date.now() }); return current;
  });
  await sender.send(logic.message(device.token, { title: 'IMNVLab · Teste de notificação', body: 'O push chegou! Toque para abrir a central de alertas.' }, randomUUID()));
  return { accepted: true };
});

async function deliver(ref, value, offline) {
  const now = Date.now(), attempt = randomUUID(), stateRef = db.doc(`pushState/${ref.id}`);
  const job = await db.runTransaction(async tx => {
    const [deviceDoc, stateDoc] = await Promise.all([tx.get(ref), tx.get(stateRef)]);
    const device = deviceDoc.data(), state = stateDoc.data() || {};
    if (!device?.enabled || !device.token || now - (device.updatedAt?.toMillis() || 0) > 90 * 86400000) return null;
    if ((state.lockUntil || 0) > now) return null;
    if (!offline && value.at <= (state.lastReadingAt || 0)) return null;
    // Scheduler snapshots can race with a new reading: never overwrite a more recent one.
    if (offline && (state.lastReadingAt || 0) > value.at) return null;
    const settings = { ...logic.DEFAULTS, ...device.settings };
    const alert = logic.condition(value, settings, offline);
    if (!logic.shouldSend(state, alert, now)) {
      tx.set(stateRef, { ...(!offline ? { lastReadingAt: value.at } : {}), ...(alert.signature === 'normal' ? { alerted: false } : {}) }, { merge: true });
      return null;
    }
    tx.set(stateRef, { attempt, lockUntil: now + 90000, ...(!offline ? { lastReadingAt: value.at } : {}), lastAttemptAt: now }, { merge: true });
    return { device, alert };
  });
  if (!job) return;
  try {
    await sender.send(logic.message(job.device.token, job.alert, attempt));
    await db.runTransaction(async tx => {
      const state = (await tx.get(stateRef)).data();
      if (state?.attempt !== attempt) return;
      tx.set(stateRef, { lockUntil: 0, lastSentAt: Date.now(), lastSentSignature: job.alert.signature, alerted: job.alert.signature !== 'normal', lastResult: 'accepted' }, { merge: true });
    });
  } catch (error) {
    const invalid = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code);
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (invalid && current?.token === job.device.token) tx.update(ref, { enabled: false, token: FieldValue.delete() });
      tx.set(stateRef, { lockUntil: Date.now() + 60000, lastResult: error.code || 'unknown' }, { merge: true });
    });
    console.error('Falha no push:', error.code || 'unknown');
  }
}
async function broadcast(value, offline = false) {
  let cursor;
  for (;;) {
    let query = db.collection('pushDevices').orderBy(FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (let i = 0; i < snapshot.docs.length; i += 10) {
      await Promise.all(snapshot.docs.slice(i, i + 10).filter(doc => doc.data().enabled).map(doc => deliver(doc.ref, value, offline)));
    }
    cursor = snapshot.docs.at(-1);
    if (snapshot.size < 200) break;
  }
}
exports.weatherPush = onDocumentCreated({ document: 'leituras/{id}', retry: false, timeoutSeconds: 300 }, async event => {
  const value = logic.reading(event.data?.data());
  if (!value || Date.now() - value.at > 120000 || value.at > Date.now() + 30000) return;
  const ref = db.doc('pushInternal/station');
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (!current || value.at > current.at) tx.set(ref, value);
  });
  await broadcast(value);
});
exports.stationOfflinePush = onSchedule({ schedule: 'every 5 minutes', timeoutSeconds: 300 }, async () => {
  // Written exclusively by the fresh-reading trigger; old imports cannot generate offline alarms.
  const value = (await db.doc('pushInternal/station').get()).data();
  if (!value || Date.now() - value.at <= 120000) return;
  await broadcast(value, true);
});
