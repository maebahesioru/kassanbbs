import { err, ok } from "neverthrow";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getRuntimeKey } from "hono/adapter";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const generateSubjectTxtRepository = async (
  { sql, logger }: VakContext
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "generateSubjectTxt", message: "Generating subject.txt" });

  const runtime = getRuntimeKey();
  if (runtime === "workerd") {
    logger.info({ operation: "generateSubjectTxt", message: "Skipping subject.txt generation in workerd runtime" });
    return ok(undefined);
  }

  try {
    const rows = await sql<{ id: string; title: string; response_count: number }[]>`
      SELECT
        t.id,
        t.title,
        COUNT(r.id)::int as response_count
      FROM threads as t
        LEFT JOIN responses as r ON t.id = r.thread_id
      WHERE t.is_stopped = FALSE AND t.is_pooled = FALSE
      GROUP BY t.id, t.title
      ORDER BY (t.attrs->>'sticky')::boolean DESC, t.updated_at DESC
    `;

    const lines = (rows || []).map(r => `${r.id}.dat,${r.title} (${r.response_count})`);
    const content = lines.join("\n") + "\n";

    const publicDir = join(process.cwd(), "public");
    await writeFile(join(publicDir, "subject.txt"), content, "utf-8");

    logger.info({ operation: "generateSubjectTxt", count: lines.length, message: "subject.txt generated successfully" });
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "generateSubjectTxt", error, message: msg });
    return err(new DatabaseError(`subject.txtの生成に失敗: ${msg}`, error));
  }
};