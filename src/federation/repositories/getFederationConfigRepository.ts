import { ok, err } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export type FederationConfig = {
  enabled: boolean;
  remoteServers: string[];
  sharedBoards: string[];
};

const DEFAULT_CONFIG: FederationConfig = {
  enabled: false,
  remoteServers: [],
  sharedBoards: [],
};

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS federation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    remote_servers TEXT NOT NULL DEFAULT '[]',
    shared_boards TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
  )
`;

export const getFederationConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<FederationConfig, DatabaseError>> => {
  logger.debug({
    operation: "getFederationConfig",
    message: "Fetching federation configuration",
  });

  try {
    await sql.unsafe(createTableQuery);

    const result = await sql<
      { enabled: boolean; remote_servers: string; shared_boards: string }[]
    >`
      SELECT enabled, remote_servers, shared_boards FROM federation_config WHERE id = 1
    `;

    if (!result || result.length === 0) {
      await sql`
        INSERT INTO federation_config (id, enabled, remote_servers, shared_boards)
        VALUES (1, FALSE, '[]', '[]')
        ON CONFLICT (id) DO NOTHING
      `;
      logger.info({
        operation: "getFederationConfig",
        message: "Federation config initialized with defaults",
      });
      return ok(DEFAULT_CONFIG);
    }

    const config: FederationConfig = {
      enabled: result[0].enabled,
      remoteServers: JSON.parse(result[0].remote_servers) as string[],
      sharedBoards: JSON.parse(result[0].shared_boards) as string[],
    };

    logger.info({
      operation: "getFederationConfig",
      enabled: config.enabled,
      serverCount: config.remoteServers.length,
      message: "Federation configuration retrieved",
    });

    return ok(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getFederationConfig",
      error,
      message: `Database error while fetching federation config: ${message}`,
    });
    return err(
      new DatabaseError(
        `連合設定の取得中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};

export const updateFederationConfigRepository = async (
  { sql, logger }: VakContext,
  config: FederationConfig
): Promise<Result<FederationConfig, DatabaseError>> => {
  logger.debug({
    operation: "updateFederationConfig",
    enabled: config.enabled,
    message: "Updating federation configuration",
  });

  try {
    await sql`
      INSERT INTO federation_config (id, enabled, remote_servers, shared_boards, updated_at)
      VALUES (1, ${config.enabled}, ${JSON.stringify(config.remoteServers)}, ${JSON.stringify(config.sharedBoards)}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        remote_servers = EXCLUDED.remote_servers,
        shared_boards = EXCLUDED.shared_boards,
        updated_at = NOW()
    `;

    logger.info({
      operation: "updateFederationConfig",
      enabled: config.enabled,
      message: "Federation configuration updated",
    });

    return ok(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "updateFederationConfig",
      error,
      message: `Database error while updating federation config: ${message}`,
    });
    return err(
      new DatabaseError(
        `連合設定の更新中にエラーが発生しました: ${message}`,
        error
      )
    );
  }
};
