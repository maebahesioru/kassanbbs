import { logger } from "hono/logger";
import { pinoLogger, type PinoLogger } from "hono-pino";
import { createRoute } from "honox/factory";

import { csrf } from "../middlewares/csrfMiddleware";
import {
  dbClientMiddlewareConditional,
  type DbClient,
} from "../middlewares/dbInitializeMiddleware";
import { mobileDetectionMiddleware } from "../middlewares/mobileDetectionMiddleware";
import { initializePluginsUsecase } from "../../src/plugin/usecases/initializePluginsUsecase";
import { executePatchesUsecase } from "../../src/plugin/usecases/executePatchesUsecase";
import { getBoardByKeyRepository } from "../../src/board/repositories/getBoardByKeyRepository";
import { getBoardsRepository } from "../../src/board/repositories/getBoardsRepository";

import type { ClientInfo } from "../../src/detection/services/mobileDetectionService";
import type { ReadBoard } from "../../src/board/domain/read/ReadBoard";

let pluginsInitialized = false;
let patchesExecuted = false;

export default createRoute(
  pinoLogger({
    pino: {
      level: "warn",
    },
  }),
  logger(),
  mobileDetectionMiddleware(),
  csrf(),
  dbClientMiddlewareConditional({
    envKey: "DATABASE_URL",
    contextKey: "sql",
  }),
  async (c, next) => {
    if (!pluginsInitialized) {
      pluginsInitialized = true;
      const { sql, logger } = c.var;
      const result = await initializePluginsUsecase({ sql, logger });
      if (result.isOk()) {
        logger.info({ operation: "pluginInit", count: result.value, message: "Plugins initialized" });
      }
    }
    if (!patchesExecuted) {
      patchesExecuted = true;
      const { sql, logger } = c.var;
      const patchResult = await executePatchesUsecase({ sql, logger });
      if (patchResult.isOk() && patchResult.value.length > 0) {
        logger.info({ operation: "patchExec", patches: patchResult.value, message: "Patches applied" });
      }
    }
    // Board resolution
    const { sql: sql2, logger: logger2 } = c.var;
    if (sql2) {
      const boardKey = c.req.param("board") || c.req.query("board") || "main";
      try {
        const boardResult = await getBoardByKeyRepository({ sql: sql2, logger: logger2 }, { boardKey });
        if (boardResult.isOk()) {
          c.set("board", boardResult.value);
          c.set("boardId", boardResult.value.id);
        } else {
          const boardsResult = await getBoardsRepository({ sql: sql2, logger: logger2 }, false);
          if (boardsResult.isOk() && boardsResult.value.length > 0) {
            c.set("board", boardsResult.value[0]);
            c.set("boardId", boardsResult.value[0].id);
          }
        }
      } catch {
        // Silently skip
      }
    }
    await next();
  }
);

declare module "hono" {
  interface ContextVariableMap {
    logger: PinoLogger;
    sql: DbClient;
    jwtPayload?: { exp: number; username?: string; isSuperAdmin?: boolean };
    board?: ReadBoard;
    boardId?: string;
    clientInfo?: ClientInfo;
  }
}
