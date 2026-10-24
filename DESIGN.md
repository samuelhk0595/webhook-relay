---
name: Webhook Forwarder
description: Interface operacional clara para acompanhar entregas de webhook.
colors:
  primary: "#12675e"
  primary-hover: "#0d554d"
  rail: "#163540"
  rail-text: "#c4d5db"
  rail-selected: "#2b515a"
  background: "#f5f7f9"
  surface: "#ffffff"
  foreground: "#20323e"
  muted-foreground: "#526575"
  border: "#dce4e9"
  input-border: "#a3b1bc"
  ring: "#187c72"
  destructive: "#b23535"
  warning: "#8c550d"
  queue-background: "#edf5f4"
  received-series: "#386ad0"
  delivered-series: "#16776b"
  failed-attempt-series: "#ad670c"
typography:
  headline:
    fontFamily: "Public Sans Variable, Segoe UI, sans-serif"
    fontSize: "27px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Public Sans Variable, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Public Sans Variable, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Public Sans Variable, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 550
  measurement:
    fontFamily: "Public Sans Variable, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 620
    lineHeight: 1.3
    letterSpacing: "-0.04em"
  code:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
    fontSize: "12px"
rounded:
  badge: "5px"
  input: "6px"
  button: "7px"
  panel: "10px"
  dialog: "12px"
spacing:
  tight: "8px"
  compact: "12px"
  regular: "16px"
  group: "20px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "8px 15px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.button}"
    padding: "8px 15px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.input}"
    padding: "8px 11px"
---

# Design System: Webhook Forwarder

## Overview

**Creative North Star: "Operação legível"**

Sistema extraído de `frontend/src/styles.css` e dos componentes implementados, após validação visual em navegador. A direção confirmada é uma interface operacional clara, de fundo claro, com navegação lateral recolhível e falhas/pendências em destaque. O sistema serve tarefas repetidas: leitura rápida de estado, diagnóstico e configuração.

**Key Characteristics:**
- Hierarquia compacta e alinhamento consistente.
- Navegação azul-petróleo; superfícies claras e ação teal.
- Estados com rótulo textual, nunca somente cor.
- Formulários dedicados; diálogos apenas quando exigem confirmação ou foco protegido.

## Colors

### Primary

Teal operacional identifica ações primárias, links e seleção contextual. Azul-petróleo dá orientação persistente à navegação sem tornar o conteúdo uma tela escura.

### Secondary

Azul para eventos recebidos, teal para ciclos concluídos e âmbar tracejado para tentativas com falha. Vermelho pertence a erro/falha definitiva e ações destrutivas. Cores de estado têm fundo tonal claro e rótulo explícito.

### Neutral

Fundo frio discreto, painéis brancos, texto escuro e divisórias leves. Texto secundário mantém contraste em vez de desaparecer com baixa opacidade.

**The Semantic State Rule.** Cor reforça um estado que já tem nome; tentativa com falha e entrega definitivamente falha não compartilham o mesmo rótulo.

## Typography

Uma família de trabalho: Public Sans variável, auto-hospedada; Segoe UI/sans-serif como fallback. Código, IDs, URLs e payloads usam a pilha monoespaçada do sistema. Não há tipografia de display decorativa.

A hierarquia normativa está no frontmatter. Título da página reduz para (25px) em telas pequenas. Seções de painéis usam (15px), descrições (12–13px), metadados (10–11px). Métricas usam números tabulares e reduzem para (27px) em larguras menores. Prosa de ajuda se limita a cerca de (75ch).

**The Data Type Rule.** Monoespaçada só para conteúdo literal; números de métricas e tabelas usam Public Sans com numerais tabulares.

## Layout

Shell desktop com rail de (232px), barra superior de (68px), conteúdo com padding lateral de (36px) e largura máxima de (1600px). Rail compacto de (80px); abaixo de (1200px), rail normal de (205px) e padding de (24px). Abaixo de (760px), rail dá lugar a botão de menu e Dialog, barra superior de (60px), conteúdo com padding de (18px).

Métricas e metadados passam de quatro para duas colunas abaixo de (950px). A grade de política do formulário passa a uma coluna. Filtros flexíveis empilham em largura até (480px), evitando cortar opções padrão no celular. Tabelas têm rolagem horizontal local; seu wrapper é relativo para conter captions visualmente ocultas. Nunca mascarar overflow do documento inteiro para esconder um defeito.

Painéis separados por (24px), heading com maior respiro acima que abaixo, grupos internos de (16–22px). Não transformar todo metadado em um card independente.

## Elevation & Depth

Predominantemente plano: superfície, borda e tom separam regiões. Botões têm sombra mínima; sobreposições ganham sombra com deslocamento e scrim. Não há vidro, glow, textura ou imagem decorativa. O contraste entre rail e workspace é estrutural.

Diálogos: sombra `0 18px 60px #0b243b30`; botões primários `0 1px 2px #14353414`. Focus visível: contorno de (3px), offset de (3px); inputs usam contorno de (2px), offset de (2px).

## Shapes

Cantos discretos conforme o frontmatter. Inputs retangulares e bordas claras com contraste suficiente; badges compactos, sem simular botões. Divisórias finas e borda completa, sem faixas decorativas laterais.

## Components

### Buttons

Button local no padrão shadcn/ui com CVA e Radix Slot; variantes primary, secondary, ghost e destructive. Altura mínima padrão (40px), pequena (34px), ícone (36px). Cor/background mudam em hover sem deslocar o layout. Disabled é nativo e reduz opacidade; ação pendente mostra verbo em progresso. Links de navegação preservam semântica de link.

### Inputs / Fields

Label persistente, hint associado via aria-describedby, erro de campo com aria-invalid. Foco usa ring do sistema. Inputs mobile (44px) e texto de formulário (16px) evitam zoom automático no iOS. Checkbox nativo com accent-color. Formulário retém valores em falha.

### Navigation

Rail azul-petróleo com texto claro; seleção tonal preenchida e ícone correspondente. Menu mobile usa Radix Dialog, focus trap e Escape. Ícones Lucide consistentes, decorativos quando acompanhados de texto. Botões só com ícone têm nome acessível.

### Cards / Containers

Painel branco, borda sutil completa, sem sombra em repouso. Heading, tabela e rodapé separados por ritmo e regras horizontais. Skeleton em carregamento, vazio instrutivo e erro recuperável ocupam a mesma região que os dados.

### Queue / State / Chart

Fila atual tem campo tonal teal; histórico fica em superfície branca. Badges incluem nome e ponto de cor. Recharts usa traços contínuos para recebidos/concluídos e tracejado para falhas; tabela textual expansível torna valores acessíveis sem depender do desenho.

### Dialogs / Feedback

Radix Dialog para reenvio e token exibido uma vez; AlertDialog para confirmação destrutiva. Largura máxima (560px), limite de altura pelo viewport, rolagem própria. Token só permite conclusão após confirmação de armazenamento. Toasts de ação não substituem erros inline.

Transições de estado (140–160ms), sem animação de entrada em cascata. Horário de atualização ganha realce breve (700ms), sem movimentar números. Prefers-reduced-motion desativa transições e animações.

## Do's and Don'ts

### Do:
- **Do** preservar a separação visual entre período histórico e fila atual.
- **Do** usar rótulos explícitos, foco visível e texto de recuperação em erro.
- **Do** alinhar dados tabulares e manter rolagem de tabela dentro do painel.

### Don't:
- **Don't** usar métricas fictícias ou transformar erro de API em um estado vazio de sucesso.
- **Don't** renderizar payload ou resposta remota como HTML.
- **Don't** introduzir motion decorativo, gradientes ou estilos de marketing no console operacional.
