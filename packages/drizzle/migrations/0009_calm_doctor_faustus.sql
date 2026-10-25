-- A produção ainda está na migration 0007, então esta roda sobre dados reais.
-- O código antigo derivava `url` apenas do nome do evento, então dois eventos
-- homônimos podiam colidir e a constraint falharia. Antes de criá-la,
-- renomeia os duplicados: a linha mais antiga mantém a URL original (o link
-- que já circulou) e as demais recebem -2, -3, ... até achar um valor livre.
--
-- Consulta para conferir antes de migrar:
--   SELECT url, count(*) FROM projects GROUP BY url HAVING count(*) > 1;
DO $$
DECLARE
	duplicate RECORD;
	candidate text;
	suffix integer;
BEGIN
	FOR duplicate IN
		SELECT id, url
		FROM (
			SELECT
				id,
				url,
				row_number() OVER (
					PARTITION BY url
					ORDER BY created_at, id
				) AS position
			FROM projects
		) ranked
		WHERE position > 1
	LOOP
		suffix := 2;
		LOOP
			candidate := duplicate.url || '-' || suffix;
			EXIT WHEN NOT EXISTS (SELECT 1 FROM projects WHERE url = candidate);
			suffix := suffix + 1;
		END LOOP;

		UPDATE projects SET url = candidate WHERE id = duplicate.id;
		RAISE NOTICE 'projects.url duplicada: % -> %', duplicate.url, candidate;
	END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_url_unique" UNIQUE("url");
