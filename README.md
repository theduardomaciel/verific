<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/.github/cover.png">
  <source media="(prefers-color-scheme: light)" srcset="/.github/cover_light.png">
    <img alt="verifIC" src="/.github/cover_light.png">
</picture>

<br />

## 💻 Projeto

Um sistema de credenciamento para eventos acadêmicos

#### 🧭 Em breve disponível para Web, com aplicação auxiliar Mobile

### 🚧 Features

- [x] Autenticação
    - Autenticação de usuários por e-mail institucional
- [x] Eventos
    - Criação e gerenciamento de eventos
    - Possibilidade de limitar vagas e incluir filas de espera virtuais
    - Adição de atividades
    - Gerenciamento de administradores de eventos
    - Dashboard de acompanhamento de métricas do evento em tempo real
- [x] Inscrições
    - Inscrição de participantes em eventos e atividades
    - Confirmação de inscrição por e-mail (com reprocessamento na página E-mails do dashboard)
    - Credenciamento de participantes
- [x] Controle de Acesso
    - Controle de acesso e verificação de presença via QR Code (com tempo de tolerância configurável)
- [ ] Certificados
    - Atribuição de horas por atividade (palestras, workshops, minicursos, etc.)
    - Geração de crachás personalizados
    - Emissão de certificados de participação
    - Envio automatizado de certificados por e-mail
- [ ] Relatórios
    - Emissão de relatórios de participação e atividades
- [ ] Extras
    - Suporte a múltiplos idiomas

<br />

> [!NOTE]
> O design do frontend do projeto [está disponível no Figma](https://www.figma.com/design/I55WPfDNhSViBbha5eQEq4/verifIC?node-id=1-180&t=9EoIBQM7QSojG76w-1).

<br />

## ✨ Tecnologias

- `[Base]` Next.js
- `[Estilização]` TailwindCSS + shadcn/ui
- `[Banco de dados]` Neon (PostgreSQL)
- `[Hospedagem]` Vercel

> [!NOTE]
> O projeto ainda está em desenvolvimento, portanto, diversos aspectos estarão inacabados e/ou não funcionais à medida que a aplicação torna-se mais robusta.

<br />

## 🧠 Princípios

1.  **Simplicidade**: O projeto deve ser simples de ser utilizado, sem a necessidade de um manual de instruções.
2.  **Eficiência**: O projeto deve ser eficiente, com o mínimo de recursos necessários para funcionar.
3.  **Escalabilidade**: O projeto deve ser escalável, com a possibilidade de adição de novas funcionalidades sem a necessidade de refatoração.
4.  **Acessibilidade**: O projeto deve ser acessível, com a possibilidade de utilização tanto em dispositivos desktop quanto mobile.
5.  **Segurança**: O projeto deve ser seguro, com a proteção de dados sensíveis e a prevenção de ataques.

<br />

## ⚙️ Como iniciar o projeto

Recomendamos o uso do `pnpm` por sua disponibilidade em todas as principais plataformas (Windows, Linux e Mac) e sua velocidade quando comparado ao `npm` tradicional.  
Caso o `pnpm` não esteja instalado, é possível [baixá-lo aqui](https://pnpm.io/installation).

1. Clone o repositório com:

```
git clone https://github.com/theduardomaciel/verific.git
```

> [!NOTE]
> Para clonar o repositório você precisará ter o `git` instalado na sua máquina. Caso não tenha, você pode [baixá-lo aqui](https://git-scm.com/downloads).

2. Após clonar o repositório, basta entrar na pasta do repositório clonado e acessar o projeto por meio de um editor de texto ou IDE de preferência, como o VSCode:

```
cd verific
code .
```

3. Com o terminal aberto no repositório, use `pnpm install` para instalar as dependências do projeto
   . Esse comando irá instalar todas as dependências de todos os pacotes e aplicações do monorepo.

```bash
pnpm install
```

> [!WARNING]
> Após a instalação das dependências, certifique-se de reiniciar tudo que possa estar carregando o projeto no momento, como o VSCode ou terminais.

4. Em seguida, crie um arquivo `.env` com as variáveis de ambiente adequadas para todos os pacotes (`/packages`) e aplicações (`/apps`), com base nos arquivos de exemplo `.env.example`.  
   Esse passo é essencial para o correto funcionamento dos pacotes e aplicações do monorepo.

> [!NOTE]
> Os arquivos de exemplo são `apps/web/.env.example` (app + e-mail) e `packages/drizzle/.env.example` (banco). Variáveis sensíveis nunca vão para o cliente: só `NEXT_PUBLIC_*` sai do servidor.
>
> | Grupo                  | Variáveis                                                                                              | Detalhes                                                                                                                            |
> | ---------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
> | App/URLs               | `NODE_ENV`, `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`, `PORT`                                             | Base das URLs absolutas (ex.: links do e-mail)                                                                                      |
> | Banco                  | `DATABASE_URL`                                                                                         | PostgreSQL (Neon); também lida de `packages/drizzle/.env` pelos comandos `db:*`                                                     |
> | Auth                   | `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`        | Login social Google                                                                                                                 |
> | Storage (S3, opcional) | `S3_*`, `NEXT_PUBLIC_STORAGE_BASE_URL`                                                                 | Upload de imagens; sem elas o upload falha com mensagem clara. Ver [docs/image-uploads.md](docs/image-uploads.md)                   |
> | E-mail                 | `EMAIL_PROVIDER=console\|ses\|resend`, `EMAIL_FROM`, `EMAIL_DAILY_LIMIT?`, `SES_*` ou `RESEND_API_KEY` | `console` é o padrão em dev (só loga); produção exige provedor real. Ver [docs/email-notifications.md](docs/email-notifications.md) |

5. Para dar início ao servidor local de desenvolvimento, utilize

```bash
pnpm dev
```

> [!NOTE]
> Esse comando irá iniciar o servidor local de desenvolvimento, que provavelmente estará disponível em `http://localhost:3000`.

<br />

## 🎲 Dados

Para a migração de uma nova versão do esquema para o banco de dados, utilize `pnpm db:push` para enviar os dados para a rede.

> [!WARNING]  
> Enquanto o comando `pnpm db:push` [é recomendado durante o estágio de desenvolvimento](https://orm.drizzle.team/docs/drizzle-kit-push) por conta de sua simplicidade ao omitir a geração de arquivos `.sql`, em versões de produção o seguinte procedimento deve ser realizado:
>
> Para a migração de um novo esquema para o banco de dados, utilize `pnpm db:generate` para criar o arquivo `.sql` com a migração, e em seguida `pnpm db:migrate` para enviar os dados para a rede.

### 🌱 Seed do banco (primeiro deploy)

O build do Next.js usa **Cache Components** (`cacheComponents: true`), que exige que `generateStaticParams` retorne pelo menos um resultado. **Em banco vazio, o build falha na Vercel.**

Antes do primeiro deploy (ou após `db:push`/`db:migrate` que limpa o banco), rode o seed localmente:

```bash
# Perfil mínimo: 5 usuários, 1 evento, 1 atividade (mais rápido, ~2s) — ideal para CI/deploy
pnpm db:seed --profile=minimal

# Perfil leve: 30 usuários, 2 eventos, ~40 atividades (rápido, ~5s)
pnpm db:seed --profile=light

# Perfil padrão: 400 usuários, 2 eventos, ~120 atividades
pnpm db:seed --profile=default

# Perfil de estresse: 3000+ usuários, 1 evento, ~60 atividades (para testes de carga)
pnpm db:seed --profile=stress
```

> [!NOTE]
>
> - O seed usa o `DATABASE_URL` do arquivo `packages/drizzle/.env`.
> - Use um banco **persistente** (Neon/PostgreSQL) — os dados ficam salvos entre deploys.
> - Adicione `DATABASE_URL` nas **Environment Variables da Vercel** (ambiente _Build_) para que o build encontre os dados.

Para a visualização do banco de dados, utilize `pnpm db:studio`

> [!NOTE]
> Os comandos `db:*` leem o `DATABASE_URL` do arquivo `packages/drizzle/.env`.

<br />

## 🧹 Limpeza de dependências

Caso seja necessário limpar as dependências de todos os pacotes e aplicações do monorepo, utilize o comando abaixo:

```bash
pnpm dlx rimraf --glob **/node_modules
```

<br />

## 📝 Licença

Este projeto utiliza a MIT License. Veja o arquivo de [LICENÇA](LICENSE) para mais detalhes.
