# Drizzle ORM — query conventions

This project uses Drizzle ORM everywhere possible (see `packages/drizzle` and
`packages/api/routers`). This page documents two conventions that prevent a
whole class of silent SQL bugs. Read it before writing a query that combines
the relational query builder (`db.query.*`) with subqueries or raw `sql`.

---

## The core issue: one table, two aliases

The same table can be referenced with **two different names** depending on the
API you use:

| API | Root table reference in the generated SQL |
| --- | --- |
| `db.select().from(activity)` | `"activities"` (the **SQL table name**) |
| `db.query.activity.findMany()` | `"activity"` (the **schema key** — the key in `packages/drizzle/schema/index.ts`) |

So a condition like `eq(activity.id, x)` renders as `"activities"."id"` in one
query and `"activity"."id"` in the other. Simple column conditions work in both,
because Drizzle rewrites them per query. **Correlated subqueries do not** — they
freeze whichever name was captured when they were built.

### Two concrete ways this breaks

**1. Raw `sql` referencing another table's columns inside `db.query.*`**

```ts
// ☠️ WRONG — renders MIN("activity"."starts_at"); starts_at lives on sessions
const firstSessionStart = sql`
  (SELECT MIN(${activitySession.startsAt})
   FROM ${activitySession}
   WHERE ${activitySession.activityId} = ${activity.id})
`;
```

Drizzle rebinds the interpolated `activitySession.*` columns to the **root**
alias (`activity`), producing a column that doesn't exist → `Failed query`.

**2. A module-level builder subquery used in `db.query.*`**

```ts
// ☠️ WRONG — built once, so it captures the SQL name "activities"
const hasUpcoming = exists(
  db.select({ id: activitySession.id })
    .from(activitySession)
    .where(eq(activitySession.activityId, activity.id)), // -> "activities"."id"
);

await db.query.activity.findMany({ where: and(projectFilter, hasUpcoming) });
// ✗ "activities" is not in scope; the relational root is aliased "activity"
```

Both appear to work in a `db.select()` and fail only once used inside a
relational query — so they slip through until runtime.

---

## Convention 1 — inside `db.query.*`, build correlated subqueries from the callback table

The relational builder's `where` / `orderBy` callbacks receive the
**correctly aliased table**, so build the subquery there. The callback gives you
a plain **columns object**, not the full table, so type helpers with `Pick<>`
rather than `typeof activity`.

```ts
function firstSessionStart(table: Pick<typeof activity, "id">) {
  return db
    .select({ value: min(activitySession.startsAt) })
    .from(activitySession)
    .where(eq(activitySession.activityId, table.id));
}

await db.query.activity.findMany({
  with: { sessions: { orderBy: asc(activitySession.startsAt) } },
  where: (table, { and, eq }) =>
    and(eq(table.projectId, projectId), hasUpcomingSession(table)),
  orderBy: (table, { asc }) => asc(firstSessionStart(table)),
});
```

> Never reference the module-level `activity` table inside `db.query.*` when
> building a subquery — only the callback `table` is in scope.

## Convention 2 — reuse filters across query shapes with a factory

When the same filter feeds both a relational query and a plain `db.select()`
(e.g. a list + its count), make it a **factory parameterized by the table**
instead of a shared array of prebuilt conditions. Then each caller passes the
alias its own query uses.

```ts
function buildActivitiesWhere(
  table: Pick<typeof activity, "id" | "projectId" | "name">,
  opts: { projectId: string; query?: string },
) {
  return and(
    eq(table.projectId, opts.projectId),
    opts.query ? ilike(table.name, `%${opts.query}%`) : undefined,
  );
}

// relational query -> callback table ("activity")
db.query.activity.findMany({ where: (t) => buildActivitiesWhere(t, opts) });

// count query -> plain table ("activities")
db.select({ n: count() }).from(activity).where(buildActivitiesWhere(activity, opts));
```

## When raw `sql` is fine

Raw `sql` is appropriate for things the builder has no API for, e.g.
`sql<string>\`date(${participant.joinedAt})\``, `excluded."col"` in upserts, and
`date_trunc`. The danger is specifically **correlated references to the outer
query**, so keep raw `sql` fragments self-contained or free of other tables'
columns.

---

## Quick rules

1. Inside `db.query.*`, correlated subqueries/raw `sql` must use the **callback
   table**, never the module-level table.
2. Reuse a filter across query shapes via a **factory** `(table) => ...`, not a
   prebuilt condition array.
3. Type callback-table helpers with `Pick<typeof table, ...>` (the callback
   passes columns, not the table).
4. When in doubt, log `query.toSQL().sql` and check the emitted table alias.
