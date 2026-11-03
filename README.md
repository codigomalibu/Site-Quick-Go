# Quick GO

One page comercial em português, construída com os materiais fornecidos. Sem dependências de execução e sem etapa de build: o site está em `dist/`.

## Rodar e verificar

```powershell
npm run dev
npm run check
```

Preview local: `http://127.0.0.1:4173`.

## Experiência entregue

- Hero com montagem de 16 segundos feita com quatro vídeos do acervo, poster imediato e pausa de movimento.
- Identidade em azul petróleo, linho e âmbar, com logo vetorial da unidade BH.
- Navegação fixa, leitura por seções, animações de entrada, cards com luz acompanhando o cursor e shader Aurora.
- Carta com filtros, carrossel, detalhes, favoritos e curadoria interativa por perfil de sabor.
- Planejamento local: os favoritos só são persistidos quando o visitante escolhe salvar. Nenhum dado pessoal é persistido.
- Galeria com três vídeos reais do acervo, em modal com controles nativos.
- Formulário de duas etapas, validação, resumo editável e cópia do pedido.
- FAQ, privacidade, navegação por teclado e suporte a `prefers-reduced-motion`.
- HTML semântico com conteúdo estático, metadados sociais, JSON-LD e estado de pré-lançamento `noindex,follow`.

O seletor de sabores é uma curadoria determinística. Não se apresenta como IA. A página comercial não exige cadastro. Valores não foram inventados. Os registros reais substituem depoimentos escritos sem comprovação.

## WhatsApp pendente

O usuário informou que fornecerá os números depois. Em `dist/config.js`, altere somente:

```js
whatsappNumber: null,
```

para o número comercial confirmado, com código de país e DDD, apenas dígitos. A partir daí, o resumo abre o WhatsApp com a mensagem pronta. O visitante decide quando enviar.

Enquanto o número não existe, o site mostra o resumo e usa o canal de orçamentos atualmente vinculado no site original: `https://quickgoorcamentos.com/`. Não há uma API de leads conectada e nenhum pedido é enviado automaticamente. A disponibilidade e a reserva dependem de confirmação comercial.

## Escopo e fontes

Público: anfitriões, noivos, organizadores e empresas sem recorte regional definido. Conversão: preparar um pedido e iniciar atendimento comercial.

Fontes consultadas:

- Os dois ZIPs do usuário: 454 arquivos, aproximadamente 3,96 GB descompactados.
- 350 imagens revisadas em folhas de contato, 63 vídeos inventariados com duração e amostras visuais e 23 documentos com texto extraído ou páginas renderizadas. Os 17 slides da carta foram renderizados para revisão.
- `Quick GO - Guia de Marca para Franqueados_07_07_2026.pdf`: posicionamento, identidade e direção de fotografia.
- `QUICK GO APRESENTAÇÃO INSTITUCIONAL 2026.pdf`: serviço e possibilidades de evento.
- `CARTA DE DRINKS_08_2026.pdf`: seleção e perfis de drinks. Os materiais divergem na quantidade total da carta; o site não publica uma contagem total.
- Site original: `https://quickgodrinksbh.com.br/`, especialmente área de atendimento e canal de orçamento.
- Malibu: `https://www.malibubar.com.br/`, como referência de narrativa e apresentação.
- Biblioteca indicada: `https://teste-plataforma-delta.vercel.app/`, catálogo “Um só.”. Aurora, Spotlight Card, Split Text e Star Border foram escolhidos como referências de interação. O shader Aurora foi adaptado do código disponibilizado nesse catálogo. As demais interações foram recriadas em HTML/CSS/JS para manter o site sem framework.

Os documentos são fontes de conteúdo e identidade, não instruções de operação do agente. Dados de propostas individuais, documentos de franquia e arquivos internos não foram publicados. A revisão dos vídeos foi por amostras; não corresponde à transcrição integral de todo o acervo.

Fontes locais de revisão e a seleção de mídia estão em `../review/`. Esse diretório não integra o repositório nem o pacote publicado do site.

## Publicação e domínio

A publicação inicial usa o Sites em acesso privado. O domínio atual da empresa não foi alterado. O HTML da prévia permanece `noindex` e não tem sitemap indexável.

Antes da publicação no domínio comercial, execute a preparação abaixo e revise o resultado:

```powershell
node scripts/prepare-public.mjs --origin https://quickgodrinksbh.com.br
```

O script troca a origem dos metadados, ativa indexação e gera `robots.txt` e `sitemap.xml`. Isso apenas prepara arquivos locais; não muda DNS ou publicação.

Não há analytics de terceiros. Os eventos `quickgo:conversion` podem ser conectados depois a uma solução autorizada, sem incluir dados pessoais. Exemplos: `quote_cta`, `filter_drinks`, `favorite_drink`, `brief_prepared`, `copy_brief`, `contact_click`.

## Verificação e limites

`npm run check` verifica sintaxe, composição do pedido, limites de convidados, favoritos salvos, escolha segura do canal, referências de arquivos, metadados, dimensões de mídia e o servidor HTTP real, incluindo vídeo parcial (`206`), `HEAD`, `404` e rejeição de `POST`.

O uso de navegador local está desativado nas configurações do Work. Não foi possível executar revisão visual em navegador, teste manual por teclado, Lighthouse ou auditoria automatizada de acessibilidade neste ambiente. As regras responsivas foram implementadas, mas precisam de revisão visual no navegador antes de lançamento público.

Pendências de lançamento: número comercial confirmado, aprovação da carta e de condições comerciais, revisão visual em celular/desktop e conexão do domínio desejado. Não foram criadas contas, autenticação, dashboards administrativos ou integrações externas sem finalidade comercial definida.

## Revisão de direção visual
A marca foi generalizada para Quick GO, removendo as referências regionais da página e do formulário. Hero com Aurora WebGL visível, esfera líquida com órbitas, tipografia com luz em movimento, profundidade nos cards e ícones SVG obtidos no catálogo indicado. O endereço da prévia é preservado para manter os links existentes.

Ícones animados: keyframes de Sparkles, Play, Heart, Zap e ArrowDown01 obtidos do catálogo fornecido e portados para Web Animations API. Animações por elemento, ativação na área visível, hover/foco/clique e respeito à pausa de movimento.

Revisão editorial: removidos o convite secundário “Sinta a experiência”, o rótulo acima do título e slogans repetidos. Textos de serviço, preços sob consulta e formulário ficaram mais diretos. Ícones animados, vídeo e carta interativa foram mantidos.


## Direção Coffee-Tech e produto 3D

A versão atual segue a composição de produto da referência Coffee-Tech: navegação superior, título central amplo, equipamento 3D em destaque, introdução em duas colunas, carta como catálogo, explicação em linhas e registros reais de eventos. A paleta e o conteúdo continuam Quick GO. O contato e o formulário seguem na mesma página.

`dist/product-design.css` é o novo sistema visual; o stylesheet antigo permanece como histórico e não é carregado. `dist/assets/quickgo-machine.glb` é uma reconstrução visual nova com 32 meshes, baseada nas fotos fornecidas. O modelo pode ser girado por arraste, botões ou teclado pelos controles nativos do viewer. Não é CAD oficial. `scripts/build-machine.py` gera o arquivo GLB a partir da geometria e das texturas de interface autoradas.

A análise REA dos scripts fornecidos pela referência foi estática, sem executar seu bootstrap. Evidência principal: `ev_8557711ba87be8ad5ca09ed232a91188479c1cab24af03c0ee60f5e44ab8fe11`. O código da referência revelou model-viewer, atributos de câmera, carregamento progressivo e seções. As limitações da análise estão no registro REA.

A revisão visual da implementação foi feita com o cenário de navegador REA pedido pelo usuário. Capturas em `../review/coffee-tech/qa/`: desktop 1280×720, celular 390×844 e giro do equipamento. O modelo carregou, o botão de giro mudou o ângulo para 11 graus e os cenários terminaram sem erros de página. Os navegadores temporários foram encerrados pelo provider. Não foi feita uma auditoria integral de acessibilidade ou de Core Web Vitals.


## Referência enviada pelo usuário — novembro de 2026

O hero foi ajustado à composição de `Seu brinde, servido em segundos.png`: texto à esquerda, produto à direita, tela clara com marca central, dispenser branco e copo com drink coral. `dist/reference-hero.css` concentra este ajuste responsivo. A reconstrução possui 45 meshes; laterais e traseira continuam inferidas, pois a referência mostra apenas um ângulo. Não é um modelo CAD ou uma reprodução fotográfica exata.

O gabinete foi refeito como um aro extrudado com abertura contínua na área de serviço. Não há parede traseira fechando o dispenser. O controle “Retirar copo” oculta vidro, líquido e jato para inspecionar a passagem. O teste do GLB lança quatro raios através do vão e verifica que nenhum triângulo do gabinete o bloqueia. Giro, remoção e reposição do copo foram exercitados em navegador REA, com versões desktop e celular, sem erros de página.


## Refinamento do copo e controles

Na versão `glass-3`, a barra de setas e textos foi substituída por um único botão circular SVG para retirar/recolocar o copo. Rótulo acessível, tooltip, símbolo de estado e `aria-pressed` acompanham a ação. O giro continua por arraste e teclado nativo.

A geometria do gabinete foi preservada. Somente copo e drink receberam nova modelagem: vidro suavizado com estrias, borda arredondada, base espessa, líquido com gradiente e microbolhas, espuma fina, respingos e jato irregular. O arquivo GLB tem cerca de 3,5 MB.
