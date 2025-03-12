<h1 align="center">
    verifIC
</h1>

<!-- <picture>
  <source media="(prefers-color-scheme: dark)" srcset="/.github/cover.png">
  <source media="(prefers-color-scheme: light)" srcset="/.github/cover_light.png">
    <img alt="Main project cover" src="/.github/cover_light.png">
</picture> -->

<br />

## 💻 Projeto

Um sistema de credenciamento para eventos acadêmicos

### 🚧 Features

- [ ] Autenticação
  - Autenticação de usuários por e-mail institucional
- [ ] Eventos
  - Criação e gerenciamento de eventos
  - Possibilidade de limitar vagas e incluir filas de espera virtuais
  - Adição de atividades
  - Gerenciamento de administradores de eventos
  - Dashboard de acompanhamento de métricas do evento em tempo real
- [ ] Inscrições
  - Inscrição de participantes em eventos e atividades
  - Credenciamento de participantes
- [ ] Controle de Acesso
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

#### 🧭 Em breve disponível para Web, com aplicativo auxiliar Mobile

> [!NOTE]
> O design do frontend do projeto [está disponível no Figma](https://www.figma.com/design/eizWIGzoSSiJoEfSSwDjgO/verifIC?node-id=0-1&t=aDt9NN2PI4TJpJ4I-1).

<br />

## ✨ Tecnologias

- `[Base]` Next.js
- `[Estilização]` TailwindCSS + Shadcn
- `[Banco de dados]` Neon (PostgreSQL)
- `[Hospedagem]` Vercel

> [!WARNING]
> O projeto ainda está em desenvolvimento, portanto, diversos aspectos estarão inacabados e/ou não funcionais à medida que a aplicação torna-se mais robusta.

<br />

## 🧠 Princípios

1.  **Simplicidade**: O projeto deve ser simples de ser utilizado, sem a necessidade de um manual de instruções.
2.  **Eficiência**: O projeto deve ser eficiente, com o mínimo de recursos necessários para funcionar.
3.  **Escalabilidade**: O projeto deve ser escalável, com a possibilidade de adição de novas funcionalidades sem a necessidade de refatoração.
4.  **Acessibilidade**: O projeto deve ser acessível, com a possibilidade de utilização tanto em dispositivos desktop quanto mobile.
5.  **Segurança**: O projeto deve ser seguro, com a proteção de dados sensíveis e a prevenção de ataques.

<br />

## 👣 Como iniciar o projeto

Antes mesmo de clonar o código do projeto, é necessário instalar algumas dependências globalmente. Recomendamos o uso do `pnpm` por sua disponibilidade em todas as principais plataformas (Windows, Linux e Mac) e sua velocidade quando comparado ao `npm` tradicional.
Caso o `pnpm` não esteja instalado, é possível [https://pnpm.io/installation](baixá-lo aqui).

1. Para o correto funcionamento da aplicação, instale as seguintes dependências:

```
pnpm install --global turbo dotenv-cli
```

2. Após instalar as dependências globais, clone o repositório e utilize `pnpm install` para instalar as dependências do projeto.

3. Com tudo instalado, basta acessar o projeto por meio de um editor de texto ou IDE de preferência, como o VSCode:

```
cd verific
code .
```

> [!WARNING]
> Após a instalação das dependências, certifique-se de reiniciar tudo que possa estar carregando o projeto no momento, como o VSCode ou terminais.

4. Em seguida, adicione o arquivo `.env` com as variáveis de ambiente adequadas para todos os pacotes (`/packages`) e aplicações (`/apps`), com base nos arquivos de exemplo `.env.example`.  
   Esse passo é essencial para o correto funcionamento dos pacotes e aplicações do monorepo.

5. Para dar início ao servidor local de desenvolvimento, utilize `pnpm dev`

<br />

## 🎲 Dados

Para a migração de um novo esquema para o banco de dados, utilize `pnpm db:generate` para a criação do arquivo `.sql` com a migração, e em seguida `pnpm db:migrate` para enviar os dados para a rede.  
Para a visualização do banco de dados, utilize `pnpm db:studio`

> [!WARNING]
> Execute esse comando sempre na raiz do projeto para evitar erros com variáveis de ambiente.

## 🧹 Limpeza de dependências

```bash
pnpm dlx rimraf --glob **/node_modules
```

<br />

## 📝 Licença

Este projeto utiliza a MIT License. Veja o arquivo de [LICENÇA](LICENSE) para mais detalhes.
