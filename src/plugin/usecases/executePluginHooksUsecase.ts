import { err, ok } from "neverthrow";

import type { Plugin } from "../types/PluginTypes";
import type { Result } from "neverthrow";

type PluginHookParams = {
  title?: string;
  authorName: string;
  content: string;
  mail: string;
};

export const executePreWritePlugins = async (
  plugins: Plugin[],
  params: PluginHookParams
): Promise<Result<{ allowed: boolean; reason?: string }, Error>> => {
  for (const plugin of plugins) {
    if (plugin.onPreWrite) {
      const result = await plugin.onPreWrite({
        title: params.title,
        authorName: params.authorName,
        content: params.content,
        mail: params.mail,
      });
      if (!result.allowed) {
        return ok({ allowed: false, reason: result.reason || `プラグイン「${plugin.name}」によって拒否されました` });
      }
    }
  }
  return ok({ allowed: true });
};

export const executeThreadCreatePlugins = async (
  plugins: Plugin[],
  params: { title: string; authorName: string; content: string }
): Promise<Result<{ title: string; authorName: string; content: string }, Error>> => {
  let result = { ...params };
  for (const plugin of plugins) {
    if (plugin.onThreadCreate) {
      result = await plugin.onThreadCreate(result);
    }
  }
  return ok(result);
};

export const executeResponsePostPlugins = async (
  plugins: Plugin[],
  params: { authorName: string; content: string; mail: string }
): Promise<Result<{ authorName: string; content: string; mail: string }, Error>> => {
  let result = { ...params };
  for (const plugin of plugins) {
    if (plugin.onResponsePost) {
      result = await plugin.onResponsePost(result);
    }
  }
  return ok(result);
};

export const executeReadDisplayPlugins = async (
  plugins: Plugin[],
  content: string
): Promise<Result<string, Error>> => {
  let result = content;
  for (const plugin of plugins) {
    if (plugin.onReadDisplay) {
      result = await plugin.onReadDisplay(result);
    }
  }
  return ok(result);
};
