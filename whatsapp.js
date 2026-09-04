/* Settings are managed by admin-only Cloud Functions. No Meta token enters the browser. */
(() => {
  const el = id => document.getElementById(id);
  const functions = firebase.app().functions('southamerica-east1');
  const auth = firebase.auth();
  let canManage = false;
  async function refresh() {
    try {
      const { data } = await functions.httpsCallable('getWhatsAppSettings')();
      canManage = data.admin === true;
      el('waForm').classList.toggle('hidden', !canManage);
      el('waLogin').classList.toggle('hidden', !!auth.currentUser);
      el('waLogout').classList.toggle('hidden', !auth.currentUser);
      el('waStatus').textContent = data.enabled ? '● Alertas habilitados' : '○ Alertas desativados';
      if (canManage) {
        const config = data.settings;
        el('waEnabled').checked = config.enabled;
        el('waPhone').value = config.phone || '';
        for (const key of ['maxTemp', 'minTemp', 'maxHum', 'minHum']) {
          el('wa' + key[0].toUpperCase() + key.slice(1)).value = config[key];
        }
        el('waRecovery').checked = config.recovery;
        el('waConsent').checked = config.consent === true;
        el('waFeedback').textContent = 'Administração conectada. As alterações valem para os próximos alertas.';
      } else {
        el('waFeedback').textContent = auth.currentUser ? 'Esta conta não tem permissão de administrador da estação.' : 'Entre com a conta administradora para configurar o serviço.';
      }
    } catch (error) {
      el('waForm').classList.add('hidden');
      el('waStatus').textContent = '○ Integração indisponível';
      el('waFeedback').textContent = 'O serviço de WhatsApp ainda precisa ser configurado ou está indisponível. As demais funções do painel continuam disponíveis.';
      el('waLogout').classList.toggle('hidden', !auth.currentUser);
    }
  }
  el('waLogin').addEventListener('click', async () => {
    try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch { el('waFeedback').textContent = 'Não foi possível entrar. Verifique se o login Google está habilitado e se o domínio foi autorizado no Firebase.'; }
  });
  el('waLogout').addEventListener('click', () => auth.signOut());
  el('waForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!canManage) return;
    const settings = {
      enabled: el('waEnabled').checked, phone: el('waPhone').value,
      minTemp: Number(el('waMinTemp').value), maxTemp: Number(el('waMaxTemp').value),
      minHum: Number(el('waMinHum').value), maxHum: Number(el('waMaxHum').value),
      recovery: el('waRecovery').checked, consent: el('waConsent').checked
    };
    el('waSave').disabled = true;
    try {
      await functions.httpsCallable('saveWhatsAppSettings')(settings);
      await refresh();
      el('waFeedback').textContent = 'Configuração salva. Nenhuma mensagem de teste foi enviada.';
    } catch (error) {
      el('waFeedback').textContent = error.code === 'functions/invalid-argument' ? 'Confira o telefone com código do país, os limites e a autorização do destinatário.' : 'Não foi possível salvar. Verifique sua permissão e a configuração do serviço.';
    } finally { el('waSave').disabled = false; }
  });
  auth.onAuthStateChanged(refresh);
})();
