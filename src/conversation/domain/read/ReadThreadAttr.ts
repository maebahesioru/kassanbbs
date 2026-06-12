import { ok, err, type Result } from "neverthrow";

import { ValidationError } from "../../../shared/types/Error";

export type ThreadAttr = {
  sticky?: boolean;
  sageOnly?: boolean;
  password?: string;
  threadPassword?: string;
  customMaxRes?: number;
  noId?: boolean;
  force774?: boolean;
  custom774?: string;
  stopped?: boolean;
  pooled?: boolean;
  live?: boolean;
  slipLevel?: string;
  hideNushi?: boolean;
  noPool?: boolean;
  bans?: Record<string, string>;
  ninpochoLevel?: number;
  subOwnerHashId?: string;
  caps?: Record<string, string>;
  postBackground?: string;
  nameColor?: string;
  capColor?: string;
  othelloGameState?: string;
};

export const createThreadAttr = (
  attrs: Record<string, unknown>
): Result<ThreadAttr, ValidationError> => {
  const result: ThreadAttr = {};

  if (attrs.sticky !== undefined) {
    if (typeof attrs.sticky !== "boolean") {
      return err(new ValidationError("stickyは真偽値である必要があります"));
    }
    result.sticky = attrs.sticky;
  }
  if (attrs.sageOnly !== undefined) {
    if (typeof attrs.sageOnly !== "boolean") {
      return err(new ValidationError("sageOnlyは真偽値である必要があります"));
    }
    result.sageOnly = attrs.sageOnly;
  }
  if (attrs.password !== undefined) {
    if (typeof attrs.password !== "string") {
      return err(new ValidationError("passwordは文字列である必要があります"));
    }
    result.password = attrs.password;
  }
  if (attrs.threadPassword !== undefined) {
    if (typeof attrs.threadPassword !== "string") {
      return err(new ValidationError("threadPasswordは文字列である必要があります"));
    }
    result.threadPassword = attrs.threadPassword;
  }
  if (attrs.customMaxRes !== undefined) {
    if (typeof attrs.customMaxRes !== "number" || !Number.isInteger(attrs.customMaxRes)) {
      return err(new ValidationError("customMaxResは整数である必要があります"));
    }
    result.customMaxRes = attrs.customMaxRes;
  }
  if (attrs.noId !== undefined) {
    if (typeof attrs.noId !== "boolean") {
      return err(new ValidationError("noIdは真偽値である必要があります"));
    }
    result.noId = attrs.noId;
  }
  if (attrs.force774 !== undefined) {
    if (typeof attrs.force774 !== "boolean") {
      return err(new ValidationError("force774は真偽値である必要があります"));
    }
    result.force774 = attrs.force774;
  }
  if (attrs.custom774 !== undefined) {
    if (typeof attrs.custom774 !== "string") {
      return err(new ValidationError("custom774は文字列である必要があります"));
    }
    result.custom774 = attrs.custom774;
  }
  if (attrs.stopped !== undefined) {
    if (typeof attrs.stopped !== "boolean") {
      return err(new ValidationError("stoppedは真偽値である必要があります"));
    }
    result.stopped = attrs.stopped;
  }
  if (attrs.pooled !== undefined) {
    if (typeof attrs.pooled !== "boolean") {
      return err(new ValidationError("pooledは真偽値である必要があります"));
    }
    result.pooled = attrs.pooled;
  }
  if (attrs.live !== undefined) {
    if (typeof attrs.live !== "boolean") {
      return err(new ValidationError("liveは真偽値である必要があります"));
    }
    result.live = attrs.live;
  }
  if (attrs.slipLevel !== undefined) {
    if (typeof attrs.slipLevel !== "string") {
      return err(new ValidationError("slipLevelは文字列である必要があります"));
    }
    result.slipLevel = attrs.slipLevel;
  }
  if (attrs.hideNushi !== undefined) {
    if (typeof attrs.hideNushi !== "boolean") {
      return err(new ValidationError("hideNushiは真偽値である必要があります"));
    }
    result.hideNushi = attrs.hideNushi;
  }
  if (attrs.noPool !== undefined) {
    if (typeof attrs.noPool !== "boolean") {
      return err(new ValidationError("noPoolは真偽値である必要があります"));
    }
    result.noPool = attrs.noPool;
  }
  if (attrs.bans !== undefined) {
    if (typeof attrs.bans !== "object" || attrs.bans === null) {
      return err(new ValidationError("bansはオブジェクトである必要があります"));
    }
    const bans: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs.bans)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return err(new ValidationError("bansのキーと値は文字列である必要があります"));
      }
      bans[key] = value;
    }
    result.bans = bans;
  }
  if (attrs.ninpochoLevel !== undefined) {
    if (typeof attrs.ninpochoLevel !== "number" || !Number.isInteger(attrs.ninpochoLevel)) {
      return err(new ValidationError("ninpochoLevelは整数である必要があります"));
    }
    result.ninpochoLevel = attrs.ninpochoLevel;
  }
  if (attrs.subOwnerHashId !== undefined) {
    if (typeof attrs.subOwnerHashId !== "string") {
      return err(new ValidationError("subOwnerHashIdは文字列である必要があります"));
    }
    result.subOwnerHashId = attrs.subOwnerHashId;
  }
  if (attrs.caps !== undefined) {
    if (typeof attrs.caps !== "object" || attrs.caps === null) {
      return err(new ValidationError("capsはオブジェクトである必要があります"));
    }
    const caps: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs.caps)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return err(new ValidationError("capsのキーと値は文字列である必要があります"));
      }
      caps[key] = value;
    }
    result.caps = caps;
  }
  if (attrs.postBackground !== undefined) {
    if (typeof attrs.postBackground !== "string") {
      return err(new ValidationError("postBackgroundは文字列である必要があります"));
    }
    result.postBackground = attrs.postBackground;
  }
  if (attrs.nameColor !== undefined) {
    if (typeof attrs.nameColor !== "string") {
      return err(new ValidationError("nameColorは文字列である必要があります"));
    }
    result.nameColor = attrs.nameColor;
  }
  if (attrs.capColor !== undefined) {
    if (typeof attrs.capColor !== "string") {
      return err(new ValidationError("capColorは文字列である必要があります"));
    }
    result.capColor = attrs.capColor;
  }
  if (attrs.othelloGameState !== undefined) {
    if (typeof attrs.othelloGameState !== "string") {
      return err(new ValidationError("othelloGameStateは文字列である必要があります"));
    }
    result.othelloGameState = attrs.othelloGameState;
  }

  return ok(result);
};
