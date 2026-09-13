# IMNVLab

Site de monitoramento ambiental com medições em tempo real, histórico por dia, alertas visuais e assistente Lumi.

## Publicação

Envie os arquivos deste projeto ao GitHub e publique pela Vercel. O arquivo `vercel.json` copia somente os arquivos públicos e a pasta assets necessários. Não é necessário instalar dependências nem enviar node_modules.

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

## Uso casual e visual enxuto · v31

Com autorização do usuário, removido o atalho repetido “Explorar um dia” do Início; o acesso pelo banner e por Dados continua disponível. Fonte de cuidados e observações técnicas da Lumi ficam em “Saiba mais”. A faixa com setas e contador do banner foi retirada; a troca automática mantém apenas um pequeno controle de pausa e as preferências de movimento reduzido.

A Lumi passa a oferecer resumo curto do ambiente e botão “Me explica melhor”, preservando a interpretação completa. O botão alterna entre detalhe e resumo. Reconhece formas mais casuais, como “tá quente?”, “e a umidade?”, “não entendi”, “tudo bem?” e “me mostra os dados de ontem”, além de perguntas iniciadas com “Lumi,”. Explicações de continuação usam o assunto anterior apenas durante a sessão. Leituras antigas não são apresentadas como atuais. A voz continua baseada no navegador; nenhuma conta ou serviço adicional foi incluído.

Outras funções e seções foram mantidas. Build continua em 199 caracteres; cache v31.

## Integração do mapa · v32

O mapa agora solicita imagens pelo endereço canônico https://tile.openstreetmap.org/{z}/{x}/{y}.png, com Referer real da página via strict-origin-when-cross-origin e atribuição com link de licença. O navegador mantém seu cache HTTP normal. Imagens do mapa não entram no precache do aplicativo.

A camada só é carregada quando o mapa está visível e a página ativa. Ao ocultar o mapa, solicitações em andamento são canceladas. Não há prefetch de regiões nem tentativas automáticas contínuas após falhas.

As imagens são obtidas com fetch CORS e status HTTP conferido antes de exibir: uma imagem válida de “Access blocked” recebida com erro HTTP não deve ser desenhada como mapa. Em erro HTTP, rede, CORS, decodificação ou demora de 12 segundos, a interface oferece mensagem curta, tentativa manual e link para a localização no OpenStreetMap. Não há proxy, alteração de identidade ou contorno de bloqueios. O código não pode revogar um bloqueio de IP/domínio aplicado pelo provedor.

Verificação: solicitações de tiles simuladas em teste (nenhuma enviada ao OSM), sucesso e resposta 403 contendo imagem, ausência de consultas com mapa oculto, Referer, créditos, interrupção após falha, recuperação manual e layout 360/390/768/1440 px. A liberação efetiva no endereço publicado depende do provedor e deve ser conferida após a publicação.

Referências: [política oficial de tiles](https://operations.osmfoundation.org/policies/tiles/) e [Leaflet 1.9.4](https://leafletjs.com/reference.html#tilelayer-referrerpolicy). Build permanece abaixo de 256 caracteres; cache v32.


## Ajuste visual · v33

Retirado, a pedido do usuário, o link externo abaixo do mapa. Mensagens de falha passam a orientar nova tentativa. Créditos da camada do mapa preservados.

## Sobre o projeto · v35

Nova página `#projeto`, acessível no menu lateral e em Mais no celular: ideia, equipe, desenvolvimento, tecnologias presentes no código e resultado atual. A apresentação da ideia e da equipe é um texto editorial inicial para revisão do grupo, sem nomes, datas, premiações ou números de impacto inventados. Falta acrescentar os integrantes, funções, orientação, cronologia e relatos reais da criação quando forem fornecidos.

As imagens enviadas pelo grupo estão em `assets/projeto-logo-claro.jpeg` e `assets/projeto-logo-escuro.jpeg`; alternam conforme o tema escolhido. São exclusivas da área do projeto. A publicação já inclui a pasta assets e o cache offline inclui as duas marcas. Não há novas bibliotecas ou dependências.

## Menu lateral recolhível · v37

No computador, o × recolhe o menu e o conteúdo passa a usar toda a largura disponível; o botão ☰ no cabeçalho abre novamente. A preferência fica salva neste navegador. No celular (até 700 px), o menu inicia fechado e abre sobre a página, sem deslocar o conteúdo. Fecha pelo ×, pelo fundo, por Escape ou ao escolher uma seção.

Inclui transição curta, suporte a movimento reduzido, foco contido no menu móvel, bloqueio temporário da página ao fundo e restauração do foco/rolagem ao fechar. A navegação inferior do celular continua disponível quando o menu está fechado. Testadas seis larguras, persistência, troca entre celular/computador, teclado e ambos os temas.


## Ambiente climático na apresentação · v38

Os efeitos climáticos foram retirados do banner; a galeria da escola voltou ao funcionamento anterior, sem filtros climáticos nem alteração do texto de conexão. Agora o cenário aparece exclusivamente em Mais → Modo apresentação, atrás dos dados. Inclui iluminação quente, tons frios, névoa decorativa e combinações para ar seco, umidade alta, conforto e temperatura amena. Calor intenso recebe mais luz.

As cores usam a mesma leitura mostrada na apresentação. Sem conexão, dados inválidos ou leituras com mais de dois minutos, o cenário fica neutro. Não representa previsão nem neblina observada. Transições de 2,4 s, movimento discreto e botão próprio Pausar efeitos. Animações param ao sair da apresentação, ocultar a aba, ativar economia de dados ou movimento reduzido. A preferência do tema continua respeitada. Nenhuma imagem ou dependência nova.

## Modo ambiente imersivo · v39

Acesso direto pelo botão Ver ambiente no Início; o acesso anterior em Mais continua disponível. A apresentação usa agora uma paisagem ilustrada em tela inteira, derivada da referência enviada pelo usuário com remoção dos textos, números e elementos de interface. Arquivo único: `assets/ambiente-paisagem.png` (aproximadamente 1,45 MB), incluído na publicação e no cache offline.

Temperatura e umidade reais aparecem em destaque no centro, com estado da conexão no topo. Conforto, interpretação e relógio ficam em Sobre a leitura; o horário da última medição permanece visível. Os efeitos climáticos, a pausa, o estado neutro sem dados recentes, os temas e a saída por Esc foram preservados. Testados acesso direto, celular/computador, ambos os temas, painel de detalhes, dados antigos, redução de movimento e retorno do foco ao botão de entrada.


## Animação e desempenho · v40

A paisagem tem movimento lento de câmera (42 s; 50 s no celular) e camadas suaves de nuvens. Usa transformações CSS, sem vídeo ou ciclo de desenho JavaScript. Pausa ao sair do modo, ocultar a aba, escolher Pausar efeitos ou ativar movimento reduzido/economia de dados. Somente as camadas climáticas visíveis são animadas.

As três imagens grandes foram convertidas em WebP: lumi.webp (61.740 bytes), assets/lumi-acenando.webp (61.066 bytes) e assets/ambiente-paisagem.webp (61.558 bytes). Total: 184.364 bytes contra 4.771.052 bytes, redução de 96,1%. A paisagem mantém 1672 × 941; as personagens têm largura de 520 px e transparência. Os PNGs substituídos e o banner antigo sem uso foram retirados do projeto depois de preservar cópias em C:/Users/emanuel/AppData/Local/Temp/imnvlab-original-assets-3SnqOB.

O cache inicial inclui somente os recursos essenciais. Imagens secundárias são carregadas conforme o uso; imagens já armazenadas usam cache primeiro, enquanto HTML/JS/CSS continuam buscando atualizações na rede, com fallback offline. O modo ambiente só solicita a paisagem quando aberto.

Minigráficos reutilizam o desenho quando as leituras não mudam, atualizações simultâneas do resumo são agrupadas, gráficos atualizados não repetem animações e a aba escondida mantém os dados recebidos sem redesenhar a interface a cada atualização. Ao voltar, o painel aplica as leituras mais recentes.

Validados: transparência, imagens no celular, movimento/pausa, carregamento adiado, atualização de dados, cache/offline e build real de publicação. Para publicar, envie os arquivos WebP e o vercel.json atualizado junto aos demais arquivos. Não há node_modules ou novas dependências no projeto.


### Paisagens do modo ambiente

12 ilustrações geradas com a ferramenta integrada ImageGen, em `assets/cenarios/`, otimizadas em WebP. Somente a paisagem necessária é carregada ao abrir o modo ambiente.

Horário da estação (America/Fortaleza): manhã das 6h às 11h59; tarde das 12h às 17h59; noite das 18h às 5h59. São períodos ilustrativos, não um cálculo astronômico. Frio abaixo de 18 °C; ar seco abaixo de 40%; umidade alta acima de 70%. O frio tem prioridade visual; nos demais casos, umidade seleciona o cenário seco ou úmido; a faixa intermediária usa a paisagem equilibrada. Calor a partir de 28 °C também ajusta a iluminação. Sem leitura válida dos últimos 2 minutos, o fundo fica neutro. As ilustrações não representam uma observação de chuva, vegetação ou céu da escola.

<details><summary>Prompts usados para as 12 paisagens</summary>

**seco-manha**

Use case: lighting-weather and landscape variant. Edit the supplied illustrated balcony landscape into a clearly distinct semi-arid DRY landscape: golden dry grasses, reddish sandy soil, sparse caatinga shrubs and some cactus silhouettes along lower edges, dusty distant rocky hills and a small low town. Preserve the attractive anime painted aesthetic, the balcony/roof at left, foreground framing, 16:9 wide composition, and large uncluttered sky occupying central 65% for live website text. No people, text, logos, UI or numbers. This is a full background asset, not a collage. MORNING: bright clear pale-blue sky, fresh angled early morning sunlight from right, long soft shadows; dry golden land visibly warm.

**seco-tarde**

Use case: lighting-weather and landscape variant. Edit the supplied illustrated balcony landscape into a clearly distinct semi-arid DRY landscape: golden dry grasses, reddish sandy soil, sparse caatinga shrubs and some cactus silhouettes along lower edges, dusty distant rocky hills and a small low town. Preserve the attractive anime painted aesthetic, the balcony/roof at left, foreground framing, 16:9 wide composition, and large uncluttered sky occupying central 65% for live website text. No people, text, logos, UI or numbers. This is a full background asset, not a collage. AFTERNOON: strong late afternoon amber sun, dusty warm orange horizon, saturated blue sky above, scorched ochre vegetation, long warm shadows.

**seco-noite**

Use case: lighting-weather and landscape variant. Edit the supplied illustrated balcony landscape into a clearly distinct semi-arid DRY landscape: golden dry grasses, reddish sandy soil, sparse caatinga shrubs and some cactus silhouettes along lower edges, dusty distant rocky hills and a small low town. Preserve the attractive anime painted aesthetic, the balcony/roof at left, foreground framing, 16:9 wide composition, and large uncluttered sky occupying central 65% for live website text. No people, text, logos, UI or numbers. This is a full background asset, not a collage. NIGHT: unmistakably night, deep navy sky, sparse stars and a crescent moon, cool moonlit dry rocks and cactus silhouettes, distant small warm town lights. Keep landscape discernible, no daylight or sun.

**umido-manha**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly HUMID, WARM lush landscape: deep green broadleaf foliage foreground, rich tropical green valley with a winding river and a small low town, hazy green hills. Preserve building balcony at left, wide 16:9 framing and huge quiet central sky for HTML text. Vegetation and valley must look different from the dry reference. No people, no text, logos, numbers or interface. A single full background, not a collage. Humidity is atmospheric mist, not falling rain. MORNING: luminous early morning blue sky with puffy soft clouds towards edges, dewy leaves, light mist in distant green valley, gentle fresh sunlight.

**umido-tarde**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly HUMID, WARM lush landscape: deep green broadleaf foliage foreground, rich tropical green valley with a winding river and a small low town, hazy green hills. Preserve building balcony at left, wide 16:9 framing and huge quiet central sky for HTML text. Vegetation and valley must look different from the dry reference. No people, no text, logos, numbers or interface. A single full background, not a collage. Humidity is atmospheric mist, not falling rain. AFTERNOON: golden warm humid afternoon, towering soft cumulus clouds at horizon and edges, glowing hazy sunlight, emerald foliage and reflective river, spacious blue central sky.

**umido-noite**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly HUMID, WARM lush landscape: deep green broadleaf foliage foreground, rich tropical green valley with a winding river and a small low town, hazy green hills. Preserve building balcony at left, wide 16:9 framing and huge quiet central sky for HTML text. Vegetation and valley must look different from the dry reference. No people, no text, logos, numbers or interface. A single full background, not a collage. Humidity is atmospheric mist, not falling rain. NIGHT: deep teal-navy night sky, moon partly veiled by clouds to the far right, fine haze over dark green river valley, tiny warm town window lights reflected on water. Unmistakable night, no sun or daylight.

**frio-manha**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly COOL landscape: blue-grey rolling hills, muted green vegetation, fine atmospheric mist between hills, moisture beads along far edge of balcony glass, cool toned town below. Preserve left balcony building and wide 16:9 composition with central 65% empty sky for HTML metrics. No snow, ice, snowfall or rain; represent cool air and subtle condensation. No people, words, logos, numbers or interface. Single landscape background, not collage. MORNING: cool pale early morning silver-blue light, low mist gathering in valleys, dew on plants, delicate thin clouds with a quiet light-blue clear central sky.

**frio-tarde**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly COOL landscape: blue-grey rolling hills, muted green vegetation, fine atmospheric mist between hills, moisture beads along far edge of balcony glass, cool toned town below. Preserve left balcony building and wide 16:9 composition with central 65% empty sky for HTML metrics. No snow, ice, snowfall or rain; represent cool air and subtle condensation. No people, words, logos, numbers or interface. Single landscape background, not collage. AFTERNOON: chilly late afternoon under soft blue-grey cloud layers, a faint pink band on far horizon, fog curling between muted hills, diffuse light, visibly late day but not night.

**frio-noite**

Use case: lighting-weather and landscape variant. Edit supplied anime-painted balcony reference into a distinctly COOL landscape: blue-grey rolling hills, muted green vegetation, fine atmospheric mist between hills, moisture beads along far edge of balcony glass, cool toned town below. Preserve left balcony building and wide 16:9 composition with central 65% empty sky for HTML metrics. No snow, ice, snowfall or rain; represent cool air and subtle condensation. No people, words, logos, numbers or interface. Single landscape background, not collage. NIGHT: deep indigo sky with a small moon behind thin clouds on the far right, silver moonlit fog in the valley, silhouettes of cool hills, town lights and a soft warm balcony roof light, unmistakably night.

**ameno-manha**

Use case: lighting-weather. Edit the supplied anime-painted balcony landscape reference into a mild comfortable climate: soft green garden, healthy meadow, gentle rolling mountains and small town below, clean balanced atmosphere. Keep balcony building on left and expansive central 65% empty sky for HTML weather metrics, 16:9 wide landscape. No people, text, numbers, logos or UI. No collage. Preserve delicate painterly anime style. Morning with fresh blue sky, soft morning sunshine, few small white clouds, peaceful light green vegetation.

**ameno-tarde**

Use case: lighting-weather. Edit the supplied anime-painted balcony landscape reference into a mild comfortable climate: soft green garden, healthy meadow, gentle rolling mountains and small town below, clean balanced atmosphere. Keep balcony building on left and expansive central 65% empty sky for HTML weather metrics, 16:9 wide landscape. No people, text, numbers, logos or UI. No collage. Preserve delicate painterly anime style. Late afternoon with warm peach and soft gold sky, long gentle shadows across green meadow, sun near horizon, peaceful balanced atmosphere.

**ameno-noite**

Use case: lighting-weather. Edit the supplied anime-painted balcony landscape reference into a mild comfortable climate: soft green garden, healthy meadow, gentle rolling mountains and small town below, clean balanced atmosphere. Keep balcony building on left and expansive central 65% empty sky for HTML weather metrics, 16:9 wide landscape. No people, text, numbers, logos or UI. No collage. Preserve delicate painterly anime style. Unmistakable night with deep blue starry sky, small moon, soft silver moonlight on green garden, tiny warm town lights below. No daylight.

</details>


### Otimização de setembro

O ambiente mantém transições e nuvens suaves, sem ampliar e filtrar continuamente a imagem inteira. Enquanto aberto, apenas suas medições são atualizadas; o painel retoma ao sair. Celulares e economia de dados usam paisagens de 960 px. Galeria escolar servida em WebP.

Logo escura ajustada com a ferramenta integrada ImageGen: `assets/projeto-logo-tema.webp`. Prompt: Edit this IMNVLab logo image. Preserve EXACT logo composition, symbol shapes, lettering spelling IMNVLab, INSTITUTO DE METEOROLOGIA, NONATO VALENTE. Replace only the pure black background with uniform dark navy slate #101d30 matching a meteorological website dark theme. Change existing very dark navy IMNV and small subtitle lettering to pale blue-white #dfe9fc for legibility. Keep cyan/blue Lab, cloud/wind, yellow sun and colored lines unchanged. No new elements, no shadows, no mockup, no added padding. Square raster logo.


### Simplificação dos atalhos

Removidos: leitura fácil, atalho duplicado Modo apresentação em Mais, boletins visuais e exportação CSV. Ver ambiente continua no Início; consulta por data, filtros e preferências dos cartões permanecem disponíveis. A Lumi foi ajustada para não indicar os botões removidos.
