import { ok } from "neverthrow";

import type { Nominal } from "../../../shared/types/Nominal";
import type { ReadPostedAt } from "./ReadPostedAt";
import type { ReadThreadEpochId } from "./ReadThreadEpochId";
import type { ReadThreadId } from "./ReadThreadId";
import type { ReadThreadTitle } from "./ReadThreadTitle";
import type { ThreadAttr } from "./ReadThreadAttr";
import type { Result } from "neverthrow";

export type ReadThreadWithEpochId = {
  readonly _type: "ReadThreadWithEpochId";
  readonly id: ReadThreadId;
  readonly title: ReadThreadTitle;
  readonly postedAt: ReadPostedAt;
  readonly updatedAt: ReadPostedAt;
  readonly countResponse: number;
  readonly threadEpochId: ReadThreadEpochId;
  readonly isStopped: Nominal<boolean, "ReadThreadIsStopped">;
  readonly isPooled: Nominal<boolean, "ReadThreadIsPooled">;
  readonly maxResponses: Nominal<number, "ReadThreadMaxResponses">;
  readonly attrs: Nominal<ThreadAttr, "ReadThreadAttr">;
};

export const createReadThreadWithEpochId = ({
  id,
  title,
  postedAt,
  updatedAt,
  countResponse,
  threadEpochId,
  isStopped,
  isPooled,
  maxResponses,
  attrs,
}: {
  id: ReadThreadId;
  title: ReadThreadTitle;
  postedAt: ReadPostedAt;
  updatedAt: ReadPostedAt;
  countResponse: number;
  threadEpochId: ReadThreadEpochId;
  isStopped: boolean;
  isPooled: boolean;
  maxResponses: number;
  attrs: ThreadAttr;
}): Result<ReadThreadWithEpochId, Error> => {
  return ok({
    _type: "ReadThreadWithEpochId",
    id,
    title,
    postedAt,
    updatedAt,
    countResponse,
    threadEpochId,
    isStopped: isStopped as Nominal<boolean, "ReadThreadIsStopped">,
    isPooled: isPooled as Nominal<boolean, "ReadThreadIsPooled">,
    maxResponses: maxResponses as Nominal<number, "ReadThreadMaxResponses">,
    attrs: attrs as Nominal<ThreadAttr, "ReadThreadAttr">,
  });
};
