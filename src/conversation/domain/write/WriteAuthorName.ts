import { ok, err, type Result } from "neverthrow";

import { ValidationError } from "../../../shared/types/Error";
import { createTrip } from "../../../shared/utils/createTrip";
import { parseColorName } from "../../../color/services/colorNameService";
import { parseIcon } from "../../../icon/services/iconService";

import type { BeProfile } from "../../../be/services/beService";

type SomeWriteAuthorName = {
  readonly _type: "some";
  readonly authorName: string;
  readonly trip: string;
  readonly beId: string | null;
  readonly color?: string;
  readonly icon?: string;
};

type NoneWriteAuthorName = {
  readonly _type: "none";
  readonly authorName: string;
  readonly beId: string | null;
  readonly color?: string;
  readonly icon?: string;
};

// 投稿者名
export type WriteAuthorName = {
  readonly _type: "WriteAuthorName";
  // readonly val: string;
  // some/noneパターン
  readonly val: SomeWriteAuthorName | NoneWriteAuthorName;
};

export const createWriteAuthorName = async (
  authorName: string | null,
  // 高階関数パターンで、より低レイヤの処理を隠蔽できるようにする
  getDefaultAuthorName: () => Promise<Result<string, Error>>,
  getBeProfile?: (beId: string) => Promise<Result<BeProfile | null, Error>>
): Promise<Result<WriteAuthorName, ValidationError>> => {
  if (!authorName) {
    const nanashiName = await getDefaultAuthorName();
    if (nanashiName.isErr()) {
      return err(nanashiName.error);
    }
    return ok({
      _type: "WriteAuthorName",
      val: {
        _type: "none",
        authorName: nanashiName.value,
        beId: null,
      },
    });
  }

  if (authorName.length > 100) {
    return err(new ValidationError("\u540D\u524D\u306F100\u6587\u5B57\u4EE5\u5185\u3067\u3059"));
  }

  let beId: string | null = null;
  let color: string | undefined;
  let icon: string | undefined;
  let processedName = authorName;

  if (authorName.startsWith("!be:") && getBeProfile) {
    const spaceIdx = authorName.indexOf(" ");
    const beIdRaw =
      spaceIdx > 4 ? authorName.substring(4, spaceIdx) : authorName.substring(4);
    if (beIdRaw.length > 0) {
      const profileResult = await getBeProfile(beIdRaw);
      if (profileResult.isOk() && profileResult.value) {
        beId = profileResult.value.beId;
        if (profileResult.value.tripcode) {
          return ok({
            _type: "WriteAuthorName",
            val: {
              _type: "some",
              authorName: profileResult.value.username,
              trip: profileResult.value.tripcode,
              beId,
            },
          });
        }
        processedName = profileResult.value.username;
      }
    }
  }

  // Parse @RRGGBB@ color prefix (store color but keep prefix in name for DB persistence)
  const colorResult = parseColorName(processedName);
  color = colorResult.color ?? undefined;

  // Parse ◆NN icon prefix from name AFTER color prefix
  const iconResult = parseIcon(colorResult.cleanedName);
  icon = iconResult.icon ?? undefined;

  if (processedName.includes("#")) {
    const [name, tripKey] = processedName.split("#", 2);
    const trip = createTrip(tripKey);
    return ok({
      _type: "WriteAuthorName",
      val: {
        _type: "some",
        authorName: name,
        trip: trip,
        beId,
        color,
        icon,
      },
    });
  }

  return ok({
    _type: "WriteAuthorName",
    val: {
      _type: "none",
      authorName: processedName,
      beId,
      color,
      icon,
    },
  });
};
