# IMNVLab

Site de monitoramento ambiental com medições em tempo real, histórico por dia, alertas visuais e assistente Lumi.

## Publicação

Envie os arquivos deste projeto ao GitHub e publique pela Vercel. O arquivo `vercel.json` copia somente os seis arquivos públicos necessários. Não é necessário instalar dependências nem enviar node_modules.

O Firebase continua fornecendo as medições da coleção `leituras` do projeto `climat-7c7f7`. O service worker mantém somente o cache offline do aplicativo e a limpeza dos cadastros antigos na atualização.

## Notificações

Ative em Alertas → Receba um aviso, separadamente em cada aparelho. Use Enviar teste para conferir a entrega. A confirmação do Firebase indica aceitação do envio, não recebimento pelo usuário.

O site usa Firebase Messaging 10.12.2 com payload `notification`, um único service worker e os mesmos limites do painel. Temperatura: frio abaixo de 18 °C, calor a partir de 28 °C; umidade: baixa abaixo de 40%, alta acima de 70%. Esses rótulos são descritivos; os limites de envio são os escolhidos pelo usuário.

As funções `registerPush`, `disablePush`, `testPush`, `weatherPush` e `stationOfflinePush` ficam em `functions/index.js`. Os cadastros e estados ficam em coleções privadas do Firestore. Somente medições válidas e recentes acionam avisos ambientais. A verificação de falta de dados ocorre a cada minuto e exige mais de 2 minutos sem leitura; o retorno é informado após a próxima medição válida. A mesma condição gera no máximo um lembrete por hora.

O frontend precisa ser publicado na Vercel. Para futuras alterações do backend, instale as dependências indicadas em `functions/package.json` em um ambiente de implantação e publique com Firebase CLI no projeto `climat-7c7f7`. Não envie node_modules ao GitHub. No iPhone/iPad, abra o aplicativo adicionado à Tela de Início. A entrega com o navegador fechado precisa ser validada no aparelho.

## Lumi

A Lumi interpreta as medições disponíveis, explica o índice de conforto, indica calor, frio e umidade baixa/alta, sugere cuidados gerais e orienta a navegação. Perguntas de exemplo: “como está o ambiente?”, “interprete os dados”, “quais medidas preventivas?” e “explique o gráfico”. Usa regras locais, sem um modelo generativo externo. Não confirma condições atuais com leituras antigas nem fornece previsão de chuva. As orientações gerais sobre calor se apoiam no Ministério da Saúde: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/o/ondas-de-calor
