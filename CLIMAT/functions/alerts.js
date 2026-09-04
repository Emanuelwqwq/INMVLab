const DEFAULTS = Object.freeze({ enabled: false, phone: '', consent: false, minTemp: 18, maxTemp: 30, minHum: 30, maxHum: 70, recovery: true });
function validateSettings(input) {
  const phone = String(input.phone || '').replace(/[\s()+-]/g, '');
  const { minTemp, maxTemp, minHum, maxHum } = input;
  if (![minTemp, maxTemp, minHum, maxHum].every(Number.isFinite) ||
      minTemp < -40 || maxTemp > 80 || minTemp >= maxTemp ||
      minHum < 0 || maxHum > 100 || minHum >= maxHum ||
      !/^\d{10,15}$/.test(phone) || (input.enabled && input.consent !== true) ||
      typeof input.enabled !== 'boolean' || typeof input.recovery !== 'boolean') {
    throw new Error('Configuração inválida');
  }
  return { enabled: input.enabled, phone, consent: input.consent === true, minTemp, maxTemp, minHum, maxHum, recovery: input.recovery };
}
function classify(temp, hum, config) {
  if (!Number.isFinite(temp) || !Number.isFinite(hum) || hum < 0 || hum > 100 || temp < -40 || temp > 80) return null;
  const conditions = [];
  if (temp > config.maxTemp) conditions.push('Temperatura acima do limite');
  if (temp < config.minTemp) conditions.push('Temperatura abaixo do limite');
  if (hum > config.maxHum) conditions.push('Umidade acima do limite');
  if (hum < config.minHum) conditions.push('Umidade abaixo do limite');
  return { signature: conditions.join(' | ') || 'normal', description: conditions.join('; ') || 'Ambiente voltou à faixa configurada' };
}
function shouldSend(state, condition, config, now) {
  if (!config.enabled || !config.consent || !condition) return false;
  if (condition.signature === 'normal') return config.recovery && !!state.lastSignature && state.lastSignature !== 'normal';
  return condition.signature !== state.lastSignature || now - (state.lastSentAt || 0) >= 60 * 60 * 1000;
}
function templatePayload(phone, template, condition, temp, hum, language = 'pt_BR') {
  return {
    messaging_product: 'whatsapp', to: phone, type: 'template',
    template: { name: template, language: { code: language }, components: [{ type: 'body', parameters: [
      condition.description, temp.toFixed(1).replace('.', ','), hum.toFixed(0)
    ].map(text => ({ type: 'text', text })) }] }
  };
}
module.exports = { DEFAULTS, validateSettings, classify, shouldSend, templatePayload };
