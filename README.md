# IMNVLab

Site de monitoramento ambiental com medições em tempo real, histórico por dia, alertas visuais e assistente Lumi.

## Publicação

Envie os arquivos deste projeto ao GitHub e publique pela Vercel. O arquivo `vercel.json` copia somente os nove arquivos públicos necessários. Não é necessário instalar dependências nem enviar node_modules.

O Firebase continua fornecendo as medições da coleção `leituras` do projeto `climat-7c7f7`. O service worker mantém o cache offline do aplicativo e recebe as notificações push.

## Notificações

Ative em Alertas → Receba um aviso, separadamente em cada aparelho. Use Enviar teste para conferir a entrega. A confirmação do Firebase indica aceitação do envio, não recebimento pelo usuário.

O site usa Firebase Messaging 10.12.2 com payload `notification`, um único service worker e os mesmos limites do painel. Temperatura: frio abaixo de 18 °C, calor a partir de 28 °C; umidade: baixa abaixo de 40%, alta acima de 70%. Esses rótulos são descritivos; os limites de envio são os escolhidos pelo usuário.

As funções `registerPush`, `disablePush`, `testPush`, `weatherPush` e `stationOfflinePush` ficam em `functions/index.js`. Os cadastros e estados ficam em coleções privadas do Firestore. Somente medições válidas e recentes acionam avisos ambientais. A verificação de falta de dados ocorre a cada minuto e exige mais de 2 minutos sem leitura; o retorno é informado após a próxima medição válida. A mesma condição gera no máximo um lembrete por hora.

O frontend precisa ser publicado na Vercel. Para futuras alterações do backend, instale as dependências indicadas em `functions/package.json` em um ambiente de implantação e publique com Firebase CLI no projeto `climat-7c7f7`. Não envie node_modules ao GitHub. No iPhone/iPad, abra o aplicativo adicionado à Tela de Início. A entrega com o navegador fechado precisa ser validada no aparelho.

## Lumi

A Lumi interpreta as medições disponíveis, explica o índice de conforto, indica calor, frio e umidade baixa/alta, sugere cuidados gerais e orienta a navegação. Perguntas de exemplo: “como está o ambiente?”, “interprete os dados”, “quais medidas preventivas?” e “explique o gráfico”. Usa regras locais, sem um modelo generativo externo. Não confirma condições atuais com leituras antigas nem fornece previsão de chuva. As orientações gerais sobre calor se apoiam no Ministério da Saúde: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/o/ondas-de-calor

## Visual e personagem

Tema claro em azul e lilás, navegação lateral no computador e barra inferior no celular. A Lumi aparece no resumo do ambiente e no chat, com saudações e respostas acolhedoras. Os dados e alertas continuam usando as medições reais; não há um mapa térmico com valores simulados.

Dois recursos visuais novos, preparados com a ferramenta integrada de geração de imagens (sem dependências adicionais):
- `lumi.png`: personagem fornecida pelo usuário, preservando óculos, cabelo, uniforme, tablet e textura, com remoção do fundo preto e margem menor.
- `campus-banner.png`: ilustração panorâmica de uma escola pública no Piauí, árvores, estação meteorológica e estudantes; paleta azul e verde, área à esquerda livre para texto, sem logotipos nem números. A imagem é identificada no site como ilustração.

O cache foi atualizado para v25. A publicação copia os dois recursos junto ao restante do site.

## Temas e marca

O botão de sol/lua no topo alterna entre claro e escuro no computador e no celular. A primeira visita segue o tema do aparelho; depois, a escolha fica salva neste navegador. A saudação continua seguindo o horário. Gráficos e a Lumi acompanham o tema.

A logo original do CETI Nonato Valente foi restaurada em marca-ceti.jpeg, incluindo favicon e ícone do aplicativo. Cache atualizado para v26.


## Explorar e entender o ambiente

- Comparações no Início: última leitura versus aproximadamente uma hora antes (tolerância de 10 minutos), médias de hoje e ontem até o mesmo horário, e manhã (6h–11h59) versus tarde (12h–17h59).
- Tendência recente: exige leitura de até 2 minutos, pelo menos 3 registros e intervalo mínimo de 10 minutos dentro da última hora. Não faz previsão.
- Recordes: consulta manual dos últimos 7 dias, incluindo hoje, com máximas, mínima e maior média diária por leitura. Não equivale a recordes de todo o histórico.
- Consultas de comparação e recordes usam o servidor, os quatro formatos de timestamp existentes, deduplicação por documento, prazo de 20 segundos e cache em memória por 60 segundos. Há limite de 3.000 registros por formato; quando atingido, a interface identifica a amostra como incompleta. Médias não preenchem lacunas nem ponderam pela duração entre amostras.
- Entenda o clima: oito assuntos com busca e explicações. No celular, Entenda o clima e Sobre ficam em Mais. A Lumi conhece os novos recursos e interpreta as comparações consultadas.

`explorer.js` é o único arquivo novo desta etapa. Não adiciona bibliotecas ou node_modules. Cache do aplicativo: v27. A configuração da Vercel inclui o novo arquivo.


## Experiência mais simples · v29

A seção “Além dos números” foi removida. Os minigráficos de temperatura e umidade continuam interativos: até 20 leituras, seleção por toque/teclado, horário e interrupção das linhas em pausas maiores que 2 minutos.

As 15 melhorias ficam distribuídas em poucos lugares:

- **Início:** frase com o resumo de hoje, sinal de conforto com texto, uma prioridade de atenção e mudanças desde a visita anterior. Gráfico e Lumi aparecem por padrão; comparações e panorama regional podem ser ativados na personalização.
- **Dados:** calendário mensal, resumo de manhã/tarde/noite, linha do tempo por hora, barras dos últimos 7 dias e recordes. Calendário, semana e tabela detalhada abrem sob demanda. A Lumi explica o gráfico recente ou a data selecionada.
- **Alertas:** histórico filtrável de condições e retornos à faixa; roteiro de diagnóstico de conexão com consulta de teste ao servidor.
- **Boletim visual:** imagem PNG e resumo copiável da data escolhida, produzidos no navegador somente com registros disponíveis. Inclui médias, extremos, períodos, quantidade de leituras e cobertura da amostra.
- **Mais → Deixe o site do seu jeito:** cartões opcionais do Início, leitura fácil e apresentação para TV, com saída pelo botão ou Esc. Preferências e comparação da última visita ficam neste navegador.

O histórico de condições é reconstruído com os limites atuais, não representa configurações passadas nem comprova entrega de notificações. Leituras separadas por mais de 2 minutos interrompem a confirmação de retorno à faixa. Lacunas e dias sem dados nunca equivalem a condições confortáveis.

Todos os períodos usam America/Fortaleza (UTC−3). Médias são calculadas por leitura; não preenchem lacunas. Consultas mensais e semanais têm limite de 3.000 documentos por formato de timestamp, cache em memória de 60 segundos e prazo de 20 segundos. A interface identifica resultados limitados. Os dados continuam vindo do Firebase existente, sem valores demonstrativos em produção.

Nenhuma biblioteca ou arquivo público adicional nesta etapa; permanecem 9 arquivos de publicação. Cache do aplicativo v29. Alterações locais prontas para envio ao GitHub; nenhuma publicação automática foi feita nesta etapa.

## Banner e Lumi · v30

- Banner com seis ilustrações fornecidas pelo usuário: fachada, entrada, biblioteca, sala, informática e xadrez. A entrada duplicada foi utilizada apenas uma vez. Os originais foram copiados sem edição para assets/escola-*.jpeg.
- Alternância a cada 7 segundos, transição suave, anterior/próxima e pausar/retomar. Pausa temporária com foco, mouse, página oculta ou banner fora de vista. Movimento reduzido e economia de dados iniciam sem reprodução automática. Imagens seguintes são carregadas quando selecionadas; as já visitadas podem ser recuperadas do cache offline.
- A Lumi ganhou uma nova pose junto às respostas. No celular, a imagem ocupa uma coluna pequena sem sobrepor texto, campo ou botões. A mascote é identificada como assistente virtual, com linguagem acolhedora e observações sobre a medição atual, sem inventar previsão do restante do dia.
- Perguntas simples recebem respostas mais curtas. Dados antigos continuam identificados como antigos; ausência de medições não é substituída por dados fictícios.
- Voz: síntese de fala do navegador, seleção de voz em português, preferência salva, ritmo de 0,96, pitch de 1,06 e pausas entre frases. Números e unidades são adaptados para leitura. Há exemplo e botão de parar; fechar a Lumi ou ocultar a página cancela a fala. Microfone continua pedindo revisão do que foi entendido antes de executar o comando.
- A voz depende das opções instaladas/disponíveis no navegador: não foi adicionado serviço de voz neural externo, clonagem ou conta paga. Testes automatizados verificam controle, texto enviado à síntese e cancelamento; não certificam a qualidade acústica no aparelho do usuário.

Publicação: enviar também a pasta assets ao GitHub. O buildCommand tem 199 caracteres, abaixo do limite da Vercel, e publica 8 arquivos na raiz mais 7 imagens em assets. campus-banner.png permanece no projeto como imagem anterior e não é mais incluída no pacote publicado. Cache v30. Nenhuma dependência nova.

### Nova imagem da Lumi

Arquivo: assets/lumi-acenando.png. Criado com a ferramenta integrada image_gen a partir de lumi.png; PNG com transparência, sem edição posterior. Prompt utilizado:

> Create a new pose of the exact same Lumi mascot in the supplied image for her weather school project chat sidebar. Preserve her identity: cute textured watercolor/paper chibi illustration, warm light-brown ponytail, black round glasses, small red mushroom hair clip, dark green school trousers, white school shirt with small crest and white laboratory coat. New pose: full body facing slightly toward viewer's left, welcoming open smile, one hand raised in a friendly wave, other arm holding her dark tablet close to her chest. Welcoming curious student mascot. Keep full body and fingers within frame, generous clean silhouette, no added props or text. Isolated on genuinely transparent background with alpha, no black/white background, no checkerboard pattern. Portrait PNG asset, tightly but safely framed, suitable beside a chat bubble. This is a variation of the provided character, not a new character.
