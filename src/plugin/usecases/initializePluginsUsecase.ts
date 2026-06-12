import { err, ok } from "neverthrow";

import { getPluginRegistryRepository } from "../repositories/getPluginRegistryRepository";
import { PluginRegistry } from "../core/PluginRegistry";
import { createEraPlugin, createNameGeneratorPlugin } from "../builtin";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const initializePluginsUsecase = async (
  vakContext: VakContext
): Promise<Result<number, Error>> => {
  const { logger } = vakContext;
  logger.info({ operation: "initPlugins", message: "Initializing plugin system" });

  const registry = PluginRegistry.getInstance();

  registry.register(createEraPlugin());
  registry.register(createNameGeneratorPlugin());

  const dbPlugins = await getPluginRegistryRepository(vakContext);
  if (dbPlugins.isErr()) {
    logger.warn({ operation: "initPlugins", error: dbPlugins.error, message: "Failed to load plugins from DB" });
    return ok(registry.getAllPlugins().length);
  }

  logger.info({ operation: "initPlugins", pluginCount: registry.getAllPlugins().length, message: "Plugin system initialized" });
  return ok(registry.getAllPlugins().length);
};
