const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, validateSettings, classify, shouldSend, templatePayload } = require('./alerts');
const config = { ...DEFAULTS, enabled: true, consent: true, phone: '5589999999999' };
test('validates recipient, consent, bounds and ordered thresholds', () => {
  assert.equal(validateSettings({ ...config, phone: '+55 (89) 99999-9999' }).phone, '5589999999999');
  for (const patch of [{ phone: 'bad' }, { consent: false }, { maxTemp: 10 }, { minHum: 99 }, { maxHum: 101 }, { minTemp: NaN }]) {
    assert.throws(() => validateSettings({ ...config, ...patch }));
  }
});
test('detects simultaneous heat and humidity, cold, dry and inclusive normal boundaries', () => {
  assert.match(classify(33, 86, config).signature, /Temperatura acima.*Umidade acima/);
  assert.match(classify(17, 20, config).signature, /Temperatura abaixo.*Umidade abaixo/);
  assert.equal(classify(30, 70, config).signature, 'normal');
  assert.equal(classify(18, 30, config).signature, 'normal');
  assert.equal(classify(NaN, 20, config), null);
  assert.equal(classify(25, 101, config), null);
});
test('suppresses repeats for an hour, permits changed conditions and respects disable/consent', () => {
  const condition = classify(33, 50, config), now = 10_000_000;
  assert.equal(shouldSend({}, condition, config, now), true);
  assert.equal(shouldSend({ lastSignature: condition.signature, lastSentAt: now - 1000 }, condition, config, now), false);
  assert.equal(shouldSend({ lastSignature: condition.signature, lastSentAt: now - 3600000 }, condition, config, now), true);
  assert.equal(shouldSend({}, condition, { ...config, enabled: false }, now), false);
  assert.equal(shouldSend({}, condition, { ...config, consent: false }, now), false);
});
test('recovery requires previous alert and is optional', () => {
  const normal = classify(25, 50, config);
  assert.equal(shouldSend({}, normal, config, 10000), false);
  assert.equal(shouldSend({ lastSignature: 'hot' }, normal, config, 10000), true);
  assert.equal(shouldSend({ lastSignature: 'hot' }, normal, { ...config, recovery: false }, 10000), false);
});
test('uses approved template parameters in Portuguese without provider credentials', () => {
  const result = templatePayload(config.phone, 'imnvlab_alerta_ambiental', classify(33.2, 58, config), 33.2, 58);
  assert.equal(result.type, 'template');
  assert.equal(result.template.language.code, 'pt_BR');
  assert.deepEqual(result.template.components[0].parameters.map(p => p.text), ['Temperatura acima do limite', '33,2', '58']);
  assert.equal(result.to, config.phone);
});
