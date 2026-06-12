import { createRoute } from "honox/factory";
import { getFederationConfigRepository } from "../../../../src/federation/repositories/getFederationConfigRepository";
import { checkFederationAuth } from "../../../middlewares/federationAuth";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  if (!sql) {
    return c.json({ error: "Database not available" }, 500);
  }

  if (!checkFederationAuth(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const configResult = await getFederationConfigRepository({ sql, logger });
  if (configResult.isErr()) {
    return c.json({ error: "Failed to load config" }, 500);
  }

  const config = configResult.value;
  if (!config.enabled) {
    return c.json({ error: "Federation disabled" }, 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { title, epochId, authorName, content } = body;
  if (!title || !epochId || !authorName || !content) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const threadResult = await sql`
    SELECT id FROM threads WHERE epoch_id = ${epochId}
  `;
  if (threadResult && threadResult.length > 0) {
    return c.json({ status: "already exists" }, 200);
  }

  const uuidv7Module = await import("uuidv7");
  const threadId = uuidv7Module.uuidv7();
  const responseId = uuidv7Module.uuidv7();

  try {
    await sql`
      INSERT INTO threads (id, title, posted_at, updated_at, epoch_id)
      VALUES (${threadId}::uuid, ${title}, NOW(), NOW(), ${epochId})
    `;
    await sql`
      INSERT INTO responses (id, thread_id, response_number, author_name, mail, posted_at, response_content, hash_id)
      VALUES (${responseId}::uuid, ${threadId}::uuid, 1, ${"federated:" + authorName}, '', NOW(), ${content}, ${"fed_" + threadId})
    `;
    logger.info({
      operation: "federation/receiveThread",
      threadId,
      epochId,
      title,
      message: "Federated thread received and stored",
    });
    return c.json({ status: "ok", threadId }, 201);
  } catch (error) {
    logger.error({
      operation: "federation/receiveThread",
      error,
      message: "Failed to store federated thread",
    });
    return c.json({ error: "Failed to store thread" }, 500);
  }
});
