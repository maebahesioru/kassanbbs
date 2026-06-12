import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const PluginHookType = {
  THREAD_CREATE: 1,
  RESPONSE_POST: 2,
  READ_DISPLAY: 4,
  INDEX_GENERATE: 8,
  PRE_WRITE: 16,
  PATCH: 64,
} as const;

export type PluginHookTypeValue = typeof PluginHookType[keyof typeof PluginHookType];

export interface Plugin {
  id: string;
  name: string;
  description: string;
  hookTypes: PluginHookTypeValue[];
  isActive: boolean;
  readonly patchVersion?: string;

  onThreadCreate?(params: { title: string; authorName: string; content: string }): Promise<{ title: string; authorName: string; content: string }>;
  onResponsePost?(params: { authorName: string; content: string; mail: string }): Promise<{ authorName: string; content: string; mail: string }>;
  onReadDisplay?(content: string): Promise<string>;
  onIndexGenerate?(): Promise<void>;
  onPreWrite?(params: { title?: string; authorName: string; content: string; mail: string }): Promise<{ allowed: boolean; reason?: string }>;
  onPatch?(vakContext: VakContext): Promise<Result<string, Error>>;
}

export type PluginConfig = {
  name: string;
  description: string;
  hookTypes: number[];
  config: Record<string, unknown>;
};
