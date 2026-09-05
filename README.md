# IMNVLab

Site de monitoramento climático com histórico por dia e notificações push.

## Subir no GitHub e na Vercel

Envie os arquivos deste projeto, incluindo a pasta `functions`. **Não envie `node_modules`**: as dependências são instaladas apenas quando forem necessárias. O `.gitignore` já exclui dependências, arquivos temporários e credenciais.

O site usa apenas `index.html`, `styles.css`, `dashboard.js`, `service-worker.js`, `manifest.json`, `marca-ceti.jpeg` e os dois ícones PNG. JavaScript e CSS foram unificados para reduzir o número de arquivos.

O `vercel.json` copia somente esses oito arquivos para a publicação. A pasta `functions`, as configurações do Firebase e esta documentação não são servidas aos visitantes. Na Vercel, conecte o repositório do site `https://inmv-lab.vercel.app` e deixe as configurações de build seguirem o `vercel.json`. Não é necessário instalar dependências para executar o site.

## Push: estado da implantação

- Painel com ativação/desativação por dispositivo, preferências e teste implementado.
- Acesso anônimo habilitado no Firebase, sem exigir e-mail ou telefone dos visitantes.
- As seis funções foram publicadas com sucesso em 05/09/2026: `pushStatus`, `registerPush`, `disablePush`, `testPush`, `weatherPush` e `stationOfflinePush`.
- O endpoint de disponibilidade respondeu `available: true`; o teste sem autenticação foi bloqueado com HTTP 401, como esperado.
- Imagens de build no Artifact Registry têm limpeza automática após sete dias.

O bloqueio de faturamento foi resolvido. Na última conferência, a Vercel ainda servia a versão antiga com WhatsApp: envie os arquivos atualizados para o GitHub e aguarde a publicação da Vercel. Depois ative o push e teste a entrega no seu dispositivo. A entrega real ainda não foi verificada.

## Publicar futuras alterações nas funções

Na pasta deste projeto, execute:

```powershell
npm install --prefix functions
npx --yes firebase-tools@14.27.0 login
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
npx --yes firebase-tools@14.27.0 deploy --only functions:imnvlab-push --project climat-7c7f7
```

O primeiro comando cria `functions/node_modules` apenas no computador, e essa pasta não deve ser enviada ao GitHub. Ela pode ser removida após a publicação. Os arquivos `functions/index.js` e `functions/package.json` são necessários para manter o serviço automático.

Projeto Firebase: `climat-7c7f7`. Região: `southamerica-east1`. Runtime: Node.js 22. O código usa a chave pública Web Push já configurada em `dashboard.js`; caso o Firebase recuse o cadastro, confira essa chave nas configurações de Cloud Messaging do projeto.

As coleções `pushDevices`, `pushState` e `pushInternal` são privadas, acessadas somente pelas funções autenticadas com Admin SDK. As regras existentes verificadas no Console permitem apenas `leituras` e `fcmTokens`, bloqueando essas novas coleções por padrão. Não amplie as regras para permitir acesso direto aos tokens. A permissão atual de escrita da estação não foi alterada; restringir a escrita do firmware em `leituras` é uma melhoria separada antes de abrir o serviço a um público amplo.

## Receber e testar

1. Abra o site publicado em HTTPS no celular ou computador.
2. Em **Alertas → Notificações do site**, clique em **Ativar neste dispositivo** e permita notificações no navegador.
3. Escolha os tipos e limites dos alertas e salve.
4. Clique em **Testar notificação**. O teste é enviado apenas ao dispositivo autenticado e pode ser repetido após um minuto. Confirme a chegada no aparelho: a aceitação pelo Firebase não é um recibo de entrega.
5. Confira também com a aba em segundo plano. As permissões e configurações de bateria/rede do sistema podem afetar a entrega.

No iPhone/iPad 16.4+, abra no Safari, escolha **Compartilhar → Adicionar à Tela de Início** e ative pelo ícone instalado. O navegador interno do Codex apresentou permissão bloqueada durante a verificação; use um navegador onde seja possível conceder essa permissão.

## Comportamento

- Calor, frio, umidade alta/baixa, retorno à faixa configurada e estação offline.
- Cada navegador/perfil tem suas preferências. Os limites do push são independentes dos limites locais do painel.
- A mesma condição gera no máximo um lembrete por hora; mudanças podem gerar novo aviso. Abas abertas não duplicam a notificação.
- Novos documentos de `leituras` disparam a análise. Dados inválidos, antigos (mais de dois minutos) ou futuros são ignorados. Se o firmware passar a sobrescrever um único documento, o gatilho precisará ser adaptado.
- Após a primeira leitura nova processada pelo serviço, a ausência de dados é verificada a cada cinco minutos, com aviso em aproximadamente dois a sete minutos.
- Registros sem renovação por 90 dias deixam de receber. Abrir o site com push ativo renova o cadastro. Tokens inválidos são desativados.
- Envios incertos não são repetidos automaticamente para evitar duplicações. Uma próxima leitura pode tentar após um minuto. Um envio em trânsito pode terminar após a desativação.

Foram executados 12 testes locais para datas, formatos de leitura, limites, repetição e recuperação dos alertas, deduplicação entre abas e destino seguro ao tocar na notificação. As funções já foram publicadas; falta atualizar o site na Vercel e confirmar a entrega no dispositivo.

Referências: [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), [Push no iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
