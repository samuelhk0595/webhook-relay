# Webhook Forwarder

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Stack aprovada em IMPLEMENTATION_PLAN.md: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router e Recharts; backend Rust/Axum com SQLite. Estáticos em /admin, API em /api/v1.

## Users

Administrador único de uma ferramenta pessoal interna. Opera uma VPS continuamente disponível e destinos que podem ficar offline, incluindo um computador doméstico.

## Product Purpose

Receber webhooks genéricos, persistir antes de confirmar e entregar de modo assíncrono a múltiplos destinos, com recuperação após reinício e políticas independentes de retry.

## Operating Context

O painel permite cadastrar namespaces e destinos, diagnosticar fila/falhas, corrigir configurações, pausar/retomar e reenviar eventos sem apagar o histórico. Tokens dão acesso administrativo a agentes. Não há SaaS ou cadastro público.

## Capabilities and Constraints

IMPLEMENTATION_PLAN.md é o contrato completo. Uma entrada gera um recebido e uma entrega por destino. Fila atual não depende do período histórico. Payloads são bytes, nunca HTML executável. Não prometer ordem/exactly-once. Backend Rust/SQLite e integração real implementados; tipos derivados de OpenAPI. Mocks somente em testes isolados de interface.

## Brand Commitments

Português brasileiro, interface operacional clara, fundo claro, navegação lateral recolhível e falhas/pendências em destaque; direção confirmada pelo usuário nesta etapa. Sem elementos de marketing ou dados fictícios em produção.

## Evidence on Hand

IMPLEMENTATION_PLAN.md. Não existem dados operacionais ou ativos de marca; dados sintéticos de teste devem ser identificados e isolados.

## Product Principles

- Persistência e histórico são mais importantes que aparência de sucesso.
- Distinguir eventos, entregas e tentativas.
- Explicar o alcance e as consequências de ações destrutivas.
- Exibir ausência de dados e falhas de conexão honestamente.
