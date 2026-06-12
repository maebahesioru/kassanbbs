import { ok, type Result } from "neverthrow";

import { convertFusianasan } from "../../../utils/fusianasanConverter";

import type { Nominal } from "../../../shared/types/Nominal";
import type { ValidationError } from "../../../shared/types/Error";

import { parseColorName } from "../../../color/services/colorNameService";
import { parseIcon } from "../../../icon/services/iconService";

type SomeReadAuthorName = {
  readonly _type: "some";
  readonly authorName: string;
  readonly trip: string;
  readonly beId: string | null;
  readonly color?: string;
  readonly icon?: string;
};

type NoneReadAuthorName = {
  readonly _type: "none";
  readonly authorName: string;
  readonly beId: string | null;
  readonly color?: string;
  readonly icon?: string;
};

// 投稿者名
export type ReadAuthorName = {
  readonly _type: "ReadAuthorName";
  // readonly val: string;
  // some/noneパターン
  readonly val: SomeReadAuthorName | NoneReadAuthorName;
  readonly isCapUser?: boolean;
  readonly capDisplayName?: string;
};

export const createReadAuthorName = (
  authorName: string,
  trip: string | null,
  beId?: string | null,
  isCapUser?: boolean,
  capDisplayName?: string
): Result<ReadAuthorName, ValidationError> => {
  // Parse @RRGGBB@ color and ◆NN icon from stored name
  const colorResult = parseColorName(authorName);
  const nameAfterColor = colorResult.cleanedName;
  const iconResult = parseIcon(nameAfterColor);
  const cleanedName = iconResult.cleanedName;

  if (trip === null || trip === "") {
    return ok({
      _type: "ReadAuthorName",
      val: {
        _type: "none",
        authorName: cleanedName,
        beId: beId ?? null,
        color: colorResult.color ?? undefined,
        icon: iconResult.icon ?? undefined,
      },
      isCapUser,
      capDisplayName,
    });
  }

  return ok({
    _type: "ReadAuthorName",
    val: {
      _type: "some",
      authorName: cleanedName,
      trip,
      beId: beId ?? null,
      color: colorResult.color ?? undefined,
      icon: iconResult.icon ?? undefined,
    },
    isCapUser,
    capDisplayName,
  });
};

export const formatReadAuthorName = (
  authorName: ReadAuthorName,
  capcode?: Nominal<string, "ReadCapcode">,
  host?: string
): string => {
  if (capcode) {
    return capcode as string;
  }

  const nameIcon = authorName.val.icon;

  let baseName: string;

  if (authorName.val._type === "none") {
    baseName = authorName.val.authorName;
  } else {
    baseName = `${authorName.val.authorName}\u25C6${authorName.val.trip}`;
  }

  if (authorName.isCapUser) {
    const prefix = "\u25C6";
    if (authorName.capDisplayName) {
      baseName = `${prefix}\u25B2${authorName.capDisplayName}`;
    } else {
      baseName = `${prefix}${baseName}`;
    }
  } else if (authorName.capDisplayName) {
    baseName = `\u25B2${authorName.capDisplayName}`;
  }

  if (host) {
    baseName = convertFusianasan(baseName, host);
  }

  if (nameIcon) {
    baseName = `${nameIcon} ${baseName}`;
  }

  return baseName;
};

export const getBeId = (authorName: ReadAuthorName): string | null => {
  return authorName.val.beId ?? null;
};
