// api/checar-alerta.js
//
// Essa função roda no servidor da Vercel (não no navegador do usuário).
// Ela é chamada periodicamente por um serviço externo (cron-job.org) e faz:
//   1. Lê a leitura mais recente no Firestore
//   2. Compara com os limites configurados
//   3. Se algo estiver fora da faixa E for diferente do último alerta enviado,
//      manda uma notificação push (FCM) para todos os dispositivos cadastrados

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}

const db = admin.firestore();

// Mantenha os mesmos limites usados no site. Se quiser, depois sincronizamos
// isso com os limites que o usuário configura na página de Alertas.
const THRESHOLDS = { maxTemp: 30, minHum: 30, maxHum: 70 };

module.exports = async (req, res) => {
  try {
    // 1. Pega a leitura mais recente
    const snap = await db.collection('leituras').orderBy('timestamp', 'desc').limit(1).get();
    if (snap.empty) {
      return res.status(200).json({ ok: true, message: 'Nenhuma leitura encontrada ainda.' });
    }

    const data = snap.docs[0].data();
    const temp = Number(data.temperatura);
    const hum = Number(data.umidade);

    if (!Number.isFinite(temp) || !Number.isFinite(hum)) {
      return res.status(200).json({ ok: true, message: 'Leitura inválida, ignorando.' });
    }

    // 2. Monta a lista de alertas ativos agora
    const alerts = [];
    if (temp > THRESHOLDS.maxTemp) alerts.push(`Temperatura acima de ${THRESHOLDS.maxTemp}°C (está em ${temp.toFixed(1)}°C)`);
    if (hum > THRESHOLDS.maxHum) alerts.push(`Umidade acima de ${THRESHOLDS.maxHum}% (está em ${Math.round(hum)}%)`);
    if (hum < THRESHOLDS.minHum) alerts.push(`Umidade abaixo de ${THRESHOLDS.minHum}% (está em ${Math.round(hum)}%)`);

    const signature = alerts.join('|');

    // 3. Compara com o último alerta já enviado (guardado no Firestore,
    //    porque cada chamada dessa função é isolada e não "lembra" de nada sozinha)
    const stateRef = db.collection('config').doc('lastAlert');
    const stateSnap = await stateRef.get();
    const lastSignature = stateSnap.exists ? stateSnap.data().signature : '';

    if (!signature) {
      // Está tudo normal agora. Se antes havia um alerta, limpa o estado.
      if (lastSignature) await stateRef.set({ signature: '' });
      return res.status(200).json({ ok: true, message: 'Sem alerta no momento.' });
    }

    if (signature === lastSignature) {
      return res.status(200).json({ ok: true, message: 'Mesmo alerta de antes, não notifica de novo.' });
    }

    // 4. Busca os dispositivos cadastrados para notificação
    const tokensSnap = await db.collection('tokens_notificacao').get();
    const tokens = tokensSnap.docs.map(doc => doc.id);

    if (tokens.length === 0) {
      await stateRef.set({ signature });
      return res.status(200).json({ ok: true, message: 'Alerta detectado, mas nenhum dispositivo está cadastrado ainda.' });
    }

    // 5. Envia a notificação de verdade
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Alerta climático · IMNVLab',
        body: alerts.join(' e '),
      },
    });

    await stateRef.set({ signature });

    res.status(200).json({
      ok: true,
      alerta: signature,
      enviadas: response.successCount,
      falhas: response.failureCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
