# Permissões, vagas, fila de espera e overbooking

Este documento descreve o modelo de permissões da equipe por evento e o
comportamento das atividades com vagas limitadas, incluindo a fila de espera
e o overbooking autorizado pela organização.

## Equipe do evento

O dono do evento (`projects.owner_id`) é implícito e tem todas as permissões.

Membros adicionados pela tela de **Equipe** (`/dashboard/settings/team`) são
gravados em `project_moderators` com:

- `role`: `admin` ou `staff`.
- `permissions`: lista explícita de permissões, ou `null` para usar os padrões
  do papel.
- `include_in_ranking`: quando `true`, o membro concorre ao ranking mesmo
  sendo da equipe (desde que também tenha inscrição no evento).

### Papéis padrão

- **Administrador** (`admin`): gerencia evento, atividades, participantes,
  recepção, fila, ranking e e-mails. Não altera a equipe nem cancela
  atividades por padrão.
- **Monitor** (`staff`): consulta participantes e credencia na recepção.

O dono pode marcar permissões individuais por membro, inclusive delegar
`team.manage` (gerenciar equipe) e `activities.cancel` (cancelar atividades).

### Permissões

`event.manage`, `activities.manage`, `activities.cancel`, `participants.view`,
`participants.manage`, `reception.manage`, `waitlist.manage`, `ranking.manage`,
`emails.manage`, `team.manage`.

A navegação do dashboard e as telas escondem ações sem permissão, mas o
servidor sempre revalida cada procedure.

## Vagas limitadas e fila de espera

Quando uma atividade tem `participants_limit`:

- A inscrição direta só é aceita enquanto houver vaga livre (contando
  inscritos e ofertas em aberto).
- Sem vaga, o participante entra na fila de espera (se habilitada) e recebe
  uma oferta quando uma vaga abrir.
- A oferta expira em `waitlist_offer_minutes` (ou `waitlist_offer_hours` para
  compatibilidade). O padrão é 12 horas, mas a organização pode configurar
  valores curtos, como 10 minutos.
- Após a expiração, a vaga é oferecida ao próximo da fila.
- Depois do início da atividade, a fila deixa de oferecer vagas
  automaticamente; a organização pode promover manualmente.
- Ao remover um participante ou aumentar o limite, `settleActivity` acerta a
  fila e oferece as vagas livres.

## Overbooking

A organização pode inscrever participantes além do limite de vagas nas telas
de atividade e de fila de espera. O vínculo em `participant_activities` fica
marcado com `overbooked = true`, motivo, autor e data. A fila de espera não
é chamada enquanto houver overbooking; ao remover o participante, a vaga
volta a ser oferecida.

O overbooking existe para que a organização resolva situações reais (por
exemplo, alguém que está no evento mas não conseguiu se inscrever a tempo),
mantendo a informação auditável para decisão posterior.

## Ranking

Por padrão, o dono e os membros da equipe (exceto quem marcou
`include_in_ranking`) ficam fora do ranking. O membro que também participa
do evento pode ser incluído marcando "Participar do ranking" na equipe ou
ligando "Incluir equipe no ranking" nas configurações de gamificação.
