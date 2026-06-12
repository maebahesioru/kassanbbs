import { err, ok } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { PluginConfig } from "../types/PluginTypes";
import type { Result } from "neverthrow";

export const getPluginRegistryRepository = async (
  { sql, logger }: VakContext
): Promise<Result<PluginConfig[], DatabaseError>> => {
  logger.debug({ operation: "getPluginRegistry", message: "Fetching plugin registry" });
  try {
    const rows = await sql`
      SELECT id, name, description, is_active, hook_type, config_json
      FROM plugin_registry
      WHERE is_active = TRUE
      ORDER BY name
    `;

    return ok((rows || []).map((r: any) => ({
      name: String(r.name),
      description: String(r.description || ""),
      hookTypes: [Number(r.hook_type)],
      config: typeof r.config_json === "string" ? JSON.parse(r.config_json) : (r.config_json || {}),
    })));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "getPluginRegistry", error, message: msg });
    return err(new DatabaseError(`プラグイン情報の取得に失敗: ${msg}`, error));
  }
};
