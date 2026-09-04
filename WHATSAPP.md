# Alertas automáticos do IMNVLab

O painel mantém Firebase, gráficos, mapa, exportação CSV, localização, PWA e notificações do navegador. O novo visual está em `theme.css`. Os alertas de WhatsApp são processados por uma Cloud Function a cada novo documento em `leituras`, mesmo sem navegadores abertos. Nenhuma mensagem foi enviada durante o desenvolvimento.

## Ativação no projeto climat-7c7f7

1. Configure WhatsApp Business Cloud API na Meta, um número remetente e um token de produção com permissão de envio. Crie e aprove um modelo **em português (Brasil)** chamado `imnvlab_alerta_ambiental`, com exatamente três parâmetros posicionais no corpo, sem cabeçalho nem botões obrigatórios:

   ```text
   IMNVLab — Alerta ambiental
   Condição: {{1}}
   Temperatura: {{2}} °C
   Umidade: {{3}}%
   Acompanhe as condições da estação pelo painel.
   ```

2. Habilite Cloud Functions no projeto Firebase (plano que permita Functions e Secret Manager). Habilite o provedor Google em Authentication e adicione o domínio do site aos domínios autorizados.
3. **Antes de publicar**, proteja as coleções internas nas regras existentes do Firestore. Integre os trechos abaixo às suas regras, mantendo as permissões necessárias para `leituras` e `fcmTokens`. Remova qualquer regra ampla que permita acesso a essas coleções: regras `allow` se somam e um `false` não anula outro `true`. O navegador usa apenas funções autenticadas; Admin SDK ignora essas regras.

   ```text
   match /whatsappPrivate/{document=**} { allow read, write: if false; }
   match /whatsappDeliveries/{document=**} { allow read, write: if false; }
   ```

   As escritas em `leituras` também devem estar restritas à estação, pois novos registros podem disparar mensagens. Não substitua as regras atuais por esses dois trechos isolados.

4. Instale as dependências com `npm install --prefix functions`. Copie `functions/.env.example` para `functions/.env.climat-7c7f7` e preencha o ID do telefone remetente e a versão Graph API ativa no seu app Meta (`vNN.0`). Guarde o token exclusivamente no Secret Manager:

   ```powershell
   firebase functions:secrets:set WHATSAPP_TOKEN --project climat-7c7f7
   firebase deploy --only functions:imnvlab-whatsapp --project climat-7c7f7
   ```

5. Entre uma vez pelo painel para criar o usuário no Firebase Authentication. Atribua a custom claim `admin: true` somente à conta responsável, por um ambiente administrativo com Admin SDK. Preserve outras claims existentes:

   ```js
   const user = await getAuth().getUser(UID_DO_ADMINISTRADOR);
   await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
   ```

6. Saia e entre novamente. Em **Alertas → WhatsApp**, cadastre o número com DDI, os limites e o consentimento do destinatário. Ative e salve. A próxima leitura nova fora dos limites poderá gerar um envio real. Não existe botão de teste que envie mensagens sem essa ativação.
7. Publique os arquivos do site no mesmo provedor já utilizado, incluindo `theme.css` e `whatsapp.js`. Não publique a pasta `functions`, arquivos `.env` ou credenciais. O `firebase.json` adicionado configura somente Functions e não muda a hospedagem existente.

## Comportamento e limites

- Calor, frio, umidade alta/baixa e recuperação têm limites próprios no servidor; os limites locais do navegador permanecem independentes.
- Leituras precisam conter `temperatura`, `umidade` e `timestamp` (Timestamp do Firestore, Unix em segundos/milissegundos ou data ISO). Leituras com mais de dois minutos, valores inválidos ou datas futuras são ignoradas.
- O gatilho considera documentos novos, conforme o histórico atual de `leituras`. Firmware que sobrescreva sempre o mesmo documento requer mudar o gatilho antes de usar.
- Eventos duplicados são reservados por ID, e a mesma condição só é lembrada após uma hora. Mudanças de condição podem gerar novo aviso. Durante um envio, outra leitura pode ser ignorada; o próximo registro será reavaliado.
- Timeout ou falha não tem repetição automática do mesmo evento para evitar envio duplicado. Uma leitura posterior pode tentar de novo após um minuto. Consulte `whatsappDeliveries` no Console para identificar falhas. `accepted` significa aceito pela Meta, não confirmação de entrega no aparelho; recibos de entrega exigem webhook adicional.
- O painel mostra habilitado/desativado, não promete conexão do destinatário. A prévia contém valores fictícios claramente identificados.
- Alterações de configuração valem para os próximos envios; uma chamada já iniciada à Meta pode terminar após a desativação.
- Testes locais: `node --test functions/alerts.test.js`. Eles não chamam Firebase ou Meta. A validação completa de permissões e entrega exige o ambiente configurado.

Referências: [Gatilhos do Firestore](https://firebase.google.com/docs/functions/firestore-events), [templates da API WhatsApp da Meta](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text).
