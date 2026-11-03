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
