-- O seletor antigo gravava o fim à meia-noite do último dia escolhido, e esse
-- dia contava. Agora um fim às 00:00 não conta o dia; quando há sessão nele,
-- o fim passa para as 23:59 desse dia para não perdê-lo.
UPDATE "projects" AS p
SET "end_date" = p."end_date" + interval '1 day' - interval '1 minute'
WHERE (p."end_date" AT TIME ZONE 'America/Sao_Paulo')::time = '00:00'
	AND EXISTS (
		SELECT 1
		FROM "activity_sessions" AS s
		INNER JOIN "activities" AS a ON a."id" = s."activity_id"
		WHERE a."project_id" = p."id"
			AND (s."starts_at" AT TIME ZONE 'America/Sao_Paulo')::date
				= (p."end_date" AT TIME ZONE 'America/Sao_Paulo')::date
	);
