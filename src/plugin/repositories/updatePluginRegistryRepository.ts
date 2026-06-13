import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const updatePluginActiveRepository = async (
  { sql, logger }: VakContext,
  { name, isActive }: { name: string; isActive: boolean }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "updatePluginActive", name, isActive, message: "Updating plugin active status" });
  try {
    const result = await sql`
      UPDATE plugin_registry
      SET is_active = ${isActive}
      WHERE name = ${name}
      RETURNING id
    `;
    if (!result || result.length !== 1) {
      return err(new DatabaseError(`プラグイン「${name}」の更新に失敗しました`));
    }
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "updatePluginActive", error, message: msg });
    return err(new DatabaseError(`プラグイン情報の更新に失敗: ${msg}`, error));
  }
};

export const updatePluginOrderRepository = async (
  { sql, logger }: VakContext,
  { names }: { names: string[] }
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "updatePluginOrder", names, message: "Updating plugin order" });
  try {
    for (let i = 0; i < names.length; i++) {
      await sql`
        UPDATE plugin_registry
        SET sort_order = ${i}
        WHERE name = ${names[i]}
      `;
    }
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "updatePluginOrder", error, message: msg });
    return err(new DatabaseError(`プラグインの順序更新に失敗: ${msg}`, error));
  }
};

export const rescanPluginsRepository = async (
  { sql, logger }: VakContext
): Promise<Result<void, DatabaseError>> => {
  logger.debug({ operation: "rescanPlugins", message: "Rescanning plugin registry" });
  try {
    const existing = await sql`SELECT name FROM plugin_registry`;
    const existingNames = (existing || []).map((r: any) => String(r.name));
    const builtinPlugins = ["eraPlugin", "nameGeneratorPlugin"];
    for (const bp of builtinPlugins) {
      if (!existingNames.includes(bp)) {
        await sql`
          INSERT INTO plugin_registry(id, name, description, is_active, hook_type, config_json)
          VALUES(${uuidv7()}::uuid, ${bp}, ${""}, ${true}, ${0}, ${"{}"}::jsonb)
        `;
      }
    }
    return ok(undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ operation: "rescanPlugins", error, message: msg });
    return err(new DatabaseError(`プラグインの再スキャンに失敗: ${msg}`, error));
  }
};