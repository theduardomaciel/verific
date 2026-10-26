# Notificações por e-mail

Serviço central em `packages/api/notifications/` (tabela `notifications`).
Os tipos ficam em `notifications/registry.ts`, cada um com público,
chave de idempotência, validação e template:

- **participante:** confirmação e remoção da inscrição no evento;
  inscrição, fila de espera (entrada, oferta, oferta desfeita, promoção e
  remoção), cancelamento e remoção em atividades; mudança de horário ou
  local e cancelamento da atividade;
- **organização:** aviso de cota diária, contribuidor adicionado ou
  removido e evento excluído.

Os que reagem a mudanças de estado saem depois do commit
(`notifications/triggers.ts`). Todos podem ser reprocessados em
`/dashboard/emails`.

## Provedores

| `EMAIL_PROVIDER` | Quando usar                               | Env obrigatória                                                          |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `console`        | desenvolvimento (padrão fora de produção) | `EMAIL_FROM`                                                             |
| `ses`            | produção via AWS SES                      | `EMAIL_FROM`, `SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `resend`         | produção via Resend                       | `EMAIL_FROM`, `RESEND_API_KEY`                                           |

Env (só as do provedor selecionado são exigidas; as demais são ignoradas):

```
EMAIL_PROVIDER=console
EMAIL_FROM=Verific <nao-responder@example.com>
# EMAIL_DAILY_LIMIT=1000
# SES_REGION=us-east-1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# RESEND_API_KEY=re_...
```

Regras de validação (`packages/api/notifications/config.ts`):

- Tudo é opcional na importação do env, então subir sem e-mail nunca quebra
  o boot; os requisitos por provedor são cobrados em runtime, com erro
  claro dizendo qual variável falta.
- `EMAIL_FROM` é sempre obrigatória (todos os provedores precisam dela).
- Sem `EMAIL_PROVIDER`: fora de produção usa `console`; **em produção
  falha alto**.
- `EMAIL_DAILY_LIMIT`: inteiro positivo opcional. Sem ele, sem teto.

Comportamento por provedor:

- `console`: só loga destinatário/assunto/texto e, **apenas com
  `NODE_ENV=development`**, grava o HTML em `.email-previews/` (gitignored).
  Sempre retorna sucesso.
- `ses` (AWS SES v2, `@aws-sdk/client-sesv2`): retry do SDK desligado
  (`maxAttempts: 1`, timeouts explícitos) — quem tenta de novo é o serviço.
  Throttling/limite e 5xx tentam de novo; conteúdo rejeitado, identidade
  não verificada, envio pausado e erros de validação são permanentes. SES
  não tem idempotência no `SendEmail`; a nossa vive na coluna
  `idempotency_key` (UNIQUE).
- `resend` (pacote `resend`, `{ data, error }` + try/catch): rate limit e
  5xx tentam de novo; `daily/monthly_quota_exceeded` **não** tenta de novo —
  vira `blocked_quota`; validação/endereço inválido são permanentes. A
  `idempotencyKey` da notificação é repassada como `Idempotency-Key`.
  Enviamos só o `html`/`text` que renderizamos (nunca a opção `react:`).

## Fluxo de envio

O exemplo é a confirmação de inscrição; os outros tipos seguem o mesmo
caminho a partir do passo 2.

1. `submitAnswers` cria o participante e, **depois do commit**, enfileira
   `sendNotification` com chave
   `event_registration_confirmation:<participantId>`, `to` = e-mail da
   conta, `eventId` e `entityRefs = { registrationId }`. Falha de e-mail
   nunca falha nem desfaz a inscrição (usa `after()` do Next quando há
   runtime, senão aguarda inline com try/catch). Refs ausentes ou
   malformadas lançam `InvalidEntityRefsError` **antes** de inserir a linha;
   o gatilho loga o erro com tipo e contexto e o pedido do usuário não
   quebra.
2. `sendNotification` insere com `ON CONFLICT DO NOTHING` (replay da mesma
   chave retorna a linha existente sem reenviar), confere o teto diário e
   delega a `processNotification`: claim atômico (inclui `sending` travado
   há mais de 10 min), render, até 3 tentativas com backoff só em erro
   `retryable`. Depois da validação de refs, nada disso lança exceção para
   o chamador — tudo é gravado na linha (`status`, `attempts`, `lastError`,
   `provider`, `providerMessageId`, `sentAt`, `templateVersion`).
3. Os props nunca são armazenados: todo attempt reconstrói os props do
   banco a partir de `entityRefs` (a linha guarda `propsHash`, sha256 dos
   props usados, só como auditoria), então uma falha pode ser
   re-renderizada e reprocessada depois.

## Teto diário e uso

`EMAIL_DAILY_LIMIT` conta, na mesma função usada pelo teto e pelo widget:
linhas `sent` por `sentAt` nas últimas 24h + linhas `sending` não travadas.
Estourou → status `blocked_quota`, sem envio. `getEmailUsage()` expõe
`{ sentLast24h, limit | null }` para o admin.

## Template e preview

Templates React Email v3 em `packages/api/notifications/emails/` (pt-BR, 600px, cabeçalho escuro `#12081F`, botão teal). Texto puro gerado do
mesmo JSX. Imagem do cabeçalho: usa o logo horizontal escuro
(`largeLogoDarkUrl`) centralizado a 280px, com `alt` do evento; se a URL não
for `https` absoluta ou for SVG/WebP, cai para o nome do evento em texto. Os
logos são armazenados como PNG no upload (ver `image-uploads.md`), então o
e-mail usa o arquivo direto, sem conversão no servidor.

Preview local (porta 3001 para não conflitar com o web):

```
pnpm --filter @verific/api email:dev
# http://localhost:3001 → event-registration-confirmation
```

## Página admin (`/dashboard/emails`)

- Escopo por evento (`projectId` do contexto do dashboard). Todos os
  procedures exigem dono/moderador do evento (`requireProjectAccess` em
  `packages/api/lib/project-access.ts`); `deleteProject` é só do dono.
- Widget de uso (`X` ou `X de L`, alerta em 80%, erro em 100%), contagens
  por status, filtro (padrão: pendentes + falhas + cota + travadas),
  paginação keyset e reprocessamento por linha ou em lotes de 20 com
  progresso — parando ao atingir o teto.
- "Travada" (`sending` com `updatedAt` além de 10 min) é derivada no SQL,
  nunca no cliente. Respostas nunca incluem HTML ou props renderizados;
  `entityRefs` (ids e escalares) é exposto ao organizador para o diagnóstico.
