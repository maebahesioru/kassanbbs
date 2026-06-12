import type { Plugin, PluginHookTypeValue } from "../types/PluginTypes";

// Warning: Singleton state is shared across all workers in a multi-worker environment.
// In serverless/edge deployments, each isolate may have its own instance.
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, Plugin> = new Map();
  private order: string[] = [];

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    if (!this.order.includes(plugin.name)) {
      this.order.push(plugin.name);
    }
  }

  unregister(name: string): void {
    this.plugins.delete(name);
    this.order = this.order.filter(n => n !== name);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getPluginsByHookType(hookType: PluginHookTypeValue): Plugin[] {
    return Array.from(this.plugins.values()).filter(
      p => p.isActive && p.hookTypes.includes(hookType)
    );
  }

  getAllPlugins(): Plugin[] {
    return this.order
      .map(name => this.plugins.get(name))
      .filter((p): p is Plugin => p !== undefined);
  }

  setActive(name: string, isActive: boolean): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.isActive = isActive;
    }
  }

  updateOrder(names: string[]): void {
    const validNames = names.filter(n => this.plugins.has(n));
    for (const name of this.plugins.keys()) {
      if (!validNames.includes(name)) {
        validNames.push(name);
      }
    }
    this.order = validNames;
  }

  clear(): void {
    this.plugins.clear();
    this.order = [];
  }
}
