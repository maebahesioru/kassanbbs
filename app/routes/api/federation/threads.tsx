import { createRoute } from "honox/factory";
import { getFederationConfigRepository } from "../../../../src/federation/repositories/getFederationConfigRepository";
import { checkFederationAuth } from "../../../middlewares/federationAuth";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.json({ error: "データベースが利用できません" }, 500);
  }

  if (!checkFederationAuth(c)) {
    return c.json({ error: "認証されていません" }, 401);
  }

  const configResult = await getFederationConfigRepository({ sql, logger });
  if (configResult.isErr()) {
    return c.json({ error: "設定の読み込みに失敗しました" }, 500);
  }

  const config = configResult.value;
  if (!config.enabled) {
    return c.json({ error: "連携が無効です" }, 403);
  }

  try {
    const threads = await sql<{
      id: string; title: string; posted_at: Date; epoch_id: number;
    }[]>`
      SELECT id, title, posted_at, epoch_id
      FROM threads
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    const result = threads.map((t) => ({
      id: t.id,
      title: t.title,
      postedAt: t.posted_at,
      epochId: t.epoch_id,
    }));

    logger.info({
      operation: "federation/serveThreads",
      count: result.length,
      message: "Serving threads for federation",
    });

    return c.json(result, 200);
  } catch (error) {
    logger.error({
      operation: "federation/serveThreads",
      error,
      message: "Failed to serve federated threads",
    });
    return c.json({ error: "スレッド一覧の取得に失敗しました" }, 500);
  }
});
