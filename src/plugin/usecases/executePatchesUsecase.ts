import { err, ok } from "neverthrow";

import { PluginRegistry } from "../core/PluginRegistry";
import { PluginHookType } from "../types/PluginTypes";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const executePatchesUsecase = async (
  vakContext: VakContext
): Promise<Result<string[], Error>> => {
  const { sql, logger } = vakContext;
  logger.info({ operation: "executePatches", message: "Checking for pending patches" });

  const registry = PluginRegistry.getInstance();
  const patchPlugins = registry.getPluginsByHookType(PluginHookType.PATCH);

  if (patchPlugins.length === 0) {
    logger.info({ operation: "executePatches", message: "No patch plugins found" });
    return ok([]);
  }

  const results: string[] = [];

  for (const plugin of patchPlugins) {
    if (!plugin.patchVersion || !plugin.onPatch) continue;

    try {
      const existing = await sql<{ patch_name: string }[]>`
        SELECT patch_name FROM applied_patches WHERE patch_name = ${plugin.name}
      `;

      if (existing && existing.length > 0) {
        logger.info({ operation: "executePatches", plugin: plugin.name, message: "Patch already applied, skipping" });
        continue;
      }

      logger.info({ operation: "executePatches", plugin: plugin.name, version: plugin.patchVersion, message: "Executing patch" });

      const patchResult = await plugin.onPatch(vakContext);
      if (patchResult.isErr()) {
        logger.error({ operation: "executePatches", plugin: plugin.name, error: patchResult.error, message: "Patch execution failed" });
        results.push(`${plugin.name}: failed - ${patchResult.error.message}`);
        continue;
      }

      await sql`
        INSERT INTO applied_patches(patch_name, patch_version, result)
        VALUES(${plugin.name}, ${plugin.patchVersion}, ${patchResult.value})
      `;

      logger.info({ operation: "executePatches", plugin: plugin.name, result: patchResult.value, message: "Patch applied successfully" });
      results.push(`${plugin.name}: ${patchResult.value}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ operation: "executePatches", plugin: plugin.name, error, message: msg });
      results.push(`${plugin.name}: error - ${msg}`);
    }
  }

  return ok(results);
};
