# Gamificação do evento

Módulo opcional de pontos, ranking público e adesivos. O organizador liga e
desliga a gamificação inteira e cada recurso em **Dashboard → Configurações →
Gamificação**. Sem perfil habilitado no evento, a gamificação não pode ser
ligada (o cartão vive no perfil público).

## Regras de pontos (v1)

| Ação                   | Pontos padrão            | Observação                                             |
| ---------------------- | ------------------------ | ------------------------------------------------------ |
| Primeiro check-in      | 50                       | Uma única vez, no primeiro dia em que a pessoa aparece |
| Check-in do dia        | 25                       | Somado ao primeiro check-in no dia 1 (75 no total)     |
| Presença em sessão     | `duração agendada × 100` | Arredondado para inteiro; não usa o tempo real         |
| Conclusão de sessão    | 20                       | Só com checkout habilitado; uma vez por sessão         |
| Inscrição em atividade | 10                       | Removido se a inscrição for cancelada                  |
| Ajuste manual          | livre                    | Auditado; aceita valor negativo                        |

O check-in de recepção é independente de atividades/sessões/inscrições. Ele
grava `participant_checkins` (um por participante por dia, no fuso
`America/Sao_Paulo`) e deriva os pontos diários.

Pontos vivem em um ledger idempotente (`participant_point_events.dedupe_key`).
O total agregado fica em `participant_points` para leitura O(1) do ranking.
Repetir um scan não duplica pontos.

## Checkout

Com o checkout habilitado, o monitor vê **Registrar saída** em cada sessão do
ingresso (quando é monitor). A saída grava `session_attendance.left_at` e
`left_at_by_user_id`.

A sessão é considerada concluída quando:

- a entrada aconteceu até `starts_at + tolerância`; e
- a saída aconteceu a partir de `ends_at - tolerância`.

A tolerância padrão é 10 minutos e é configurável. Só a sessão concluída rende
o bônus e o adesivo **Até o fim**. Re-scan de entrada não reescreve o
`joined_at`; o primeiro horário é preservado.

## Adesivos

São selos SVG determinísticos gerados pelo app (sem upload, sem IA). O catálogo
fica em `packages/drizzle/gamification.ts`:

- **Credenciado** — primeiro check-in;
- **Explorador** — 3 sessões;
- **Maratonista** — 8 horas de sessões;
- **Conector** — 10 visitas recebidas no perfil;
- **Madrugador** — sessão iniciada antes das 9h;
- **Elite** — top 10 do ranking;
- **Frequente** — presença em 3 dias (só em eventos multi-dia);
- **Todo dia** — presença em todos os dias (só em eventos multi-dia);
- **Até o fim** — 5 sessões concluídas (só com checkout).

Dias distintos unem check-ins de recepção e presenças em sessões. Adesivos são
permanentes depois de conquistados e podem ser concedidos manualmente no
detalhe do participante.

## Ranking

- Público em `/{eventUrl}/ranking`, com link condicional no cabeçalho.
- Mostra as `ranking.top` posições (padrão 50) + linha fixa “Você”.
- Desempate por `joined_at` e depois `id`, de forma determinística.
- Donos e moderadores ficam fora por padrão (`ranking.includeStaff = false`).
- O participante pode optar por sair (`participants.ranking_opt_out`) quando
  `ranking.allowOptOut` está ligado. Pontos e adesivos continuam visíveis.

As leituras de pontos/ranking são ilhas client e não entram no shell ISR do
perfil. O cache do projeto é invalidado quando a configuração muda; os pontos
em si nunca invalidam ISR.

## Operação

1. Ative os perfis do evento.
2. Ligue a gamificação e revise os valores.
3. Em **Dashboard → Recepção**, escaneie o QR do perfil para o check-in diário.
4. Monitores registram presença/saída na tela do ingresso.
5. Ajustes pontuais e concessão de adesivos ficam no detalhe do participante.

Mudanças de regra valem para ações futuras; não há replay automático. Cancelar
uma inscrição revoga os pontos de inscrição, presença e conclusão daquela
atividade (adesivos conquistados permanecem).

## Seed

Há um cenário de desenvolvimento com evento em andamento, check-ins, sessões
concluídas, ranking e adesivos:

```bash
pnpm --filter @verific/drizzle db:seed -- --profile=gamification
```
