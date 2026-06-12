import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";

import { sharedDbClientInstance } from "./middlewares/dbInitializeMiddleware";
import { PluginRegistry } from "../src/plugin/core/PluginRegistry";

const app = createApp();

showRoutes(app);

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  if (sharedDbClientInstance) {
    await sharedDbClientInstance.end({ timeout: 5000 });
  }
  process.exit(0);
});

export { PluginRegistry };
export default app;
