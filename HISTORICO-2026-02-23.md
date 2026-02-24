# Histórico do Projeto — 2026-02-23

Este registro consolida as decisões, implementações e validações feitas hoje para referência futura.

## Objetivo
- Manter o Weekly Rent estável por residente ao longo do ano.
- Foco exclusivo em transações SA/CASH.
- Mostrar e auditar a origem de cada valor (arquivo, data, referência, nº da transação).
- Destacar semanas não pagas e calcular Month/Year Arrears corretamente.

## Decisões e Regras
- Weekly Rent estável: derivado pela moda anual (valor semanal mais frequente observado para A/C + Nome).
- Arrears:
  - Month Arrears = (semanas esperadas no mês × Weekly Rent estável) − Total Paid do mês, mínimo 0.
  - Year Arrears = soma dos Month Arrears dos meses anteriores no ano, por residente.
- Semanas esperadas por mês deduplicadas (evita duplicar Wxx caso existam arquivos repetidos).
- Staff: quando disponível no formato 2025 (blocos por cliente), usa-se “Contact” como Staff.
- SAGE-ID = A/C; Room exibe o A/C; Tenant exibe a referência/nome lido.

## Implementações
- ETL/Aggregation: [build-yearly-data.ts](file:///c:/LAPTOP/rentarrears-app/scripts/build-yearly-data.ts)
  - Leitura dos relatórios semanais (2024: T9; 2025: blocos por cliente).
  - Filtragem SA/CASH.
  - Agregação por semana e por mês com deduplicação de semanas.
  - Cálculo do Weekly Rent por moda anual (rentCandidates).
  - Cálculo de Month/Year Arrears revisado.
  - Geração de auditoria por linha (origens por semana: arquivo, data, referência, nº, valor).
  - Saídas:
    - [monthly-arrears.json](file:///c:/LAPTOP/rentarrears-app/data/monthly-arrears.json)
    - [transactions-sa-cash-agg.json](file:///c:/LAPTOP/rentarrears-app/data/transactions-sa-cash-agg.json)
- Modelos/Tipos: [rent-model.ts](file:///c:/LAPTOP/rentarrears-app/app/rent-model.ts)
  - Adição de `audit` em `MonthlyArrearsRecord` (método, candidatos, semanas e fontes).
- UI (Dashboard): [page.tsx](file:///c:/LAPTOP/rentarrears-app/app/page.tsx)
  - Tabela mensal com colunas: Room, SAGE ID, Staff, Tenant, Weekly Rent, Weeks 01–04, Total (month), Month Arrears, Year Arrears, Audit.
  - Card “Audit” por linha: método da derivação do Weekly Rent e fontes por semana.
  - Correção de chaves únicas na lista da auditoria.
  - Destaque: semanas não pagas em vermelho negrito.
- Layout/Hidratação: [layout.tsx](file:///c:/LAPTOP/rentarrears-app/app/layout.tsx)
  - `suppressHydrationWarning` em `<html>` e `<body>` para suprimir aviso causado por extensões do navegador.

## Execução e Validação
- Geração de dados:
  - `npm run build-data`
  - Resultado (exemplo da última execução):
    - 2024: 31 semanas com dados; 504 registros mensais.
    - 2025: 48 semanas com dados; 782 registros mensais.
    - 4064 transações SA/CASH; 3774 entradas agregadas.
- Lint:
  - `npm run lint`
  - Sem erros; apenas avisos (console/unused directives).

## Como usar na UI
- Na tabela “Monthly arrears by room”, clique em “Ver” na coluna “Audit”.
- O card mostra:
  - Weekly Rent escolhido (moda) e candidatos com contagem.
  - Para cada semana do mês: valor pago e as fontes (arquivo, data, ref., nº, valor).

## Observações
- O aviso de hidratação visto no navegador decorre de extensões (ex.: Grammarly) injetando atributos no `<body>`. O projeto ignora essas diferenças com `suppressHydrationWarning`. Em navegação privada (sem extensões) o aviso não aparece.
- Se desejar outro critério para o Weekly Rent (ex.: primeiro valor do ano, mediana), é fácil substituir a regra.

## Comandos úteis
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Construir dados: `npm run build-data`

— Registro criado em 2026-02-23.

