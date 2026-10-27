# Testes de carga

Scripts [k6](https://grafana.com/docs/k6/) que simulam a jornada do navegador nos fluxos críticos: inscrição em atividade, inscrição no evento, check-in e navegação pública. O cenário segue o tamanho da Secomp: 450 inscritos (mais 20 monitores), 450 pessoas ainda por se inscrever e 30 atividades.

**Rode sempre contra um banco de teste.** O seed e as sessões gravam no banco do `DATABASE_URL`.

## Preparar

```sh
# 1. Cenário de estresse no banco
pnpm --filter @verific/drizzle db:seed --profile=stress --reset

# 2. Uma sessão por usuário do cenário, em out/sessions.json (lê apps/web/.env)
pnpm --filter @verific/load-tests sessions

# 3. Build de produção do app, depois do seed (as páginas do evento são geradas no build)
pnpm --filter web build
EMAIL_PROVIDER=console EMAIL_FROM="Verific <teste@example.com>" pnpm --filter web start
```

Sem `EMAIL_PROVIDER` e `EMAIL_FROM`, o app em produção recusa todo envio de e-mail, e as inscrições enchem o log de erros; `console` só registra os envios.

Cada execução consome os usuários do `sessions.json` em ordem. **Repita os passos 1 e 2 antes de cada execução**; o passo 3 só quando o código mudar.

## Rodar

| Script                 | Fluxo                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `01-join-activity.ts`  | Inscrição em atividade. `-e ACTIVITY=spread` espalha pelas atividades de 60 vagas; `-e ACTIVITY=form` usa a que tem formulário próprio |
| `02-event-register.ts` | Inscrição no evento                                                                                                                    |
| `03-checkin.ts`        | Check-in por QR; `TARGET` é leituras por segundo                                                                                       |
| `04-browse.ts`         | Navegação pública, 30% logados                                                                                                         |
| `05-event-day.ts`      | Navegação e check-in contínuos, com as duas inscrições em rajada em `BURST_AT` (padrão `1m`); `SCALE` multiplica as cargas             |

Nas inscrições (01 e 02) cada usuário age uma vez, então elas rodam como **rajada**: `TARGET` usuários chegam ao longo de `WINDOW` (padrão `10s`). Para achar o limite, o `bursts` repete a rajada com tamanhos crescentes (padrão 150, 300 e 450) e recria o cenário antes de cada uma:

```sh
pnpm --filter @verific/load-tests bursts --flow=join
pnpm --filter @verific/load-tests bursts --flow=join --env ACTIVITY=spread
pnpm --filter @verific/load-tests bursts --flow=register
```

O resumo fica em `out/bursts/<fluxo>.md`. Os outros scripts rodam direto:

```sh
k6 run -e PROFILE=stress packages/load-tests/k6/04-browse.ts
pnpm --filter @verific/load-tests verify
```

Parâmetros (`-e NOME=valor`):

- `PROFILE`: `smoke` (padrão, 1 iteração). Nas inscrições, `burst`; nos demais, `load`, `stress` (degraus até 150% do alvo), `spike` ou `soak`
- `TARGET`: usuários na rajada, VUs no pico ou leituras/s no check-in
- `STEP`: duração de cada degrau do `stress` (padrão `2m`)
- `BASE_URL`: padrão `http://localhost:3000`. Com `https`, os cookies de sessão levam o prefixo `__Secure-`, como no better-auth
- `SAME_IP`: o better-auth limita `/api/auth/*` por IP, então por padrão cada usuário manda um `X-Forwarded-For` próprio. Com um IP (`SAME_IP=203.0.113.10`), todos saem por ele, como na rede do campus; compare um IP dentro e um fora de `RATE_LIMIT_RELAXED_CIDRS`. `SAME_IP=true` não manda IP
- `COOKIE_CACHE=false`: não reenvia o cookie cache, para medir o pior caso das sessões
- `VERCEL_BYPASS`: token de bypass da Deployment Protection, para previews

Para guardar o resultado: `--summary-export out/<nome>.json`, ou `K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=out/<nome>.html` para o relatório em HTML.

O `verify` confere as invariantes depois da execução (inscritos dentro do limite, sem inscrições entre eventos) e termina com erro se alguma foi violada. Também mostra os e-mails do evento por estado, para ver se uma rajada deixou envios falhando.

Os scripts do k6 são tipados contra o `AppRouter`: se o app renomear uma procedure ou mudar a entrada dela, `pnpm --filter @verific/load-tests typecheck` acusa.
