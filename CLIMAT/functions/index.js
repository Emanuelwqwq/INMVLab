const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const { createHash } = require('node:crypto');
const { DEFAULTS, validateSettings, classify, shouldSend, templatePayload } = require('./alerts');
initializeApp();
const db = getFirestore();
const region = 'southamerica-east1';
const token = defineSecret('WHATSAPP_TOKEN');
const phoneId = defineString('WHATSAPP_PHONE_NUMBER_ID');
const apiVersion = defineString('WHATSAPP_API_VERSION');
const template = defineString('WHATSAPP_TEMPLATE', { default: 'imnvlab_alerta_ambiental' });
const settingsRef = db.doc('whatsappPrivate/settings');
const stateRef = db.doc('whatsappPrivate/state');

exports.getWhatsAppSettings = onCall({ region }, async request => {
  const settings = { ...DEFAULTS, ...(await settingsRef.get()).data() };
  const admin = request.auth?.token.admin === true;
  return { enabled: settings.enabled, admin, ...(admin ? { settings } : {}) };
});
exports.saveWhatsAppSettings = onCall({ region }, async request => {
  if (request.auth?.token.admin !== true) throw new HttpsError('permission-denied', 'Apenas administradores.');
  let settings;
  try { settings = validateSettings(request.data || {}); }
  catch { throw new HttpsError('invalid-argument', 'Confira o telefone, limites e consentimento.'); }
  await db.runTransaction(async tx => {
    tx.set(settingsRef, { ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth.uid });
    // Reset the baseline when the recipient or limits change.
    tx.set(stateRef, { lastSignature: '', lastSentAt: 0 }, { merge: true });
  });
  return { saved: true };
});

exports.sendWeatherWhatsApp = onDocumentCreated({
  document: 'leituras/{readingId}', region, secrets: [token], retry: false, timeoutSeconds: 60
}, async event => {
  const reading = event.data?.data();
  if (!reading || reading.temperatura == null || reading.umidade == null) return;
  const temp = Number(reading.temperatura), hum = Number(reading.umidade);
  const raw = reading.timestamp;
  const timestamp = raw?.toMillis ? raw.toMillis() : typeof raw === 'number' ? (raw > 1e10 ? raw : raw * 1000) : Date.parse(raw);
  const now = Date.now();
  // Never alert on old imports, missing dates, or implausible future timestamps.
  if (!Number.isFinite(timestamp) || now - timestamp > 120000 || timestamp > now + 30000) return;
  const deliveryRef = db.doc('whatsappDeliveries/' + createHash('sha256').update(event.id).digest('hex'));
  const job = await db.runTransaction(async tx => {
    const [configDoc, stateDoc, deliveryDoc] = await Promise.all([tx.get(settingsRef), tx.get(stateRef), tx.get(deliveryRef)]);
    const config = { ...DEFAULTS, ...configDoc.data() }, state = stateDoc.data() || {};
    const condition = classify(temp, hum, config);
    if (deliveryDoc.exists || timestamp <= (state.lastReadingAt || 0) || (state.lockUntil || 0) > now) return null;
    if (!shouldSend(state, condition, config, now)) {
      if (condition) tx.set(stateRef, { lastReadingAt: timestamp, ...(condition.signature === 'normal' ? { lastSignature: 'normal' } : {}) }, { merge: true });
      return null;
    }
    // Reserve before calling Meta: repeated Firestore events cannot send this reading twice.
    tx.create(deliveryRef, { status: 'pending', createdAt: FieldValue.serverTimestamp(), readingId: event.params.readingId });
    tx.set(stateRef, { lastReadingAt: timestamp, lockUntil: now + 60000 }, { merge: true });
    return { config, condition };
  });
  if (!job) return;
  try {
    if (!/^v\d+\.\d+$/.test(apiVersion.value()) || !/^\d+$/.test(phoneId.value())) throw new Error('provider_configuration');
    const response = await fetch(`https://graph.facebook.com/${apiVersion.value()}/${phoneId.value()}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(templatePayload(job.config.phone, template.value(), job.condition, temp, hum)),
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.json();
    if (!response.ok || !body.messages?.[0]?.id) throw new Error(`provider_${response.status}_${body.error?.code || 'invalid_response'}`);
    await db.runTransaction(async tx => {
      const current = (await tx.get(settingsRef)).data();
      tx.update(deliveryRef, { status: 'accepted', messageId: body.messages[0].id, acceptedAt: FieldValue.serverTimestamp() });
      // Do not restore a stale baseline if an administrator changed settings during the request.
      if (current?.updatedAt?.toMillis() === job.config.updatedAt?.toMillis()) {
        tx.set(stateRef, { lastSignature: job.condition.signature, lastSentAt: Date.now(), lockUntil: 0 }, { merge: true });
      } else tx.set(stateRef, { lockUntil: 0 }, { merge: true });
    });
  } catch (error) {
    // Ambiguous timeouts are not retried automatically: Meta may already have accepted them.
    await deliveryRef.update({ status: 'failed_or_unknown', error: String(error.message).slice(0, 100), failedAt: FieldValue.serverTimestamp() });
    await stateRef.set({ lockUntil: Date.now() + 60000 }, { merge: true });
    console.error('WhatsApp: envio não confirmado. Consulte whatsappDeliveries.', deliveryRef.id);
  }
});
