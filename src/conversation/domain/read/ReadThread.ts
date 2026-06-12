import { ok } from "neverthrow";

import type { Nominal } from "../../../shared/types/Nominal";
import type { ReadPostedAt } from "./ReadPostedAt";
import type { ReadThreadId } from "./ReadThreadId";
import type { ReadThreadTitle } from "./ReadThreadTitle";
import type { ThreadAttr } from "./ReadThreadAttr";
import type { Result } from "neverthrow";

export type ReadThread = {
  readonly _type: "ReadThread";
  readonly id: ReadThreadId;
  readonly title: ReadThreadTitle;
  readonly postedAt: ReadPostedAt;
  readonly updatedAt: ReadPostedAt;
  readonly countResponse: number;
  readonly isStopped: Nominal<boolean, "ReadThreadIsStopped">;
  readonly isPooled: Nominal<boolean, "ReadThreadIsPooled">;
  readonly maxResponses: Nominal<number, "ReadThreadMaxResponses">;
  readonly attrs: Nominal<ThreadAttr, "ReadThreadAttr">;
};

export const createReadThread = ({
  id,
  title,
  postedAt,
  updatedAt,
  countResponse,
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
  isStopped: boolean;
  isPooled: boolean;
  maxResponses: number;
  attrs: ThreadAttr;
}): Result<ReadThread, Error> => {
  return ok({
    _type: "ReadThread",
    id,
    title,
    postedAt,
    updatedAt,
    countResponse,
    isStopped: isStopped as Nominal<boolean, "ReadThreadIsStopped">,
    isPooled: isPooled as Nominal<boolean, "ReadThreadIsPooled">,
    maxResponses: maxResponses as Nominal<number, "ReadThreadMaxResponses">,
    attrs: attrs as Nominal<ThreadAttr, "ReadThreadAttr">,
  });
};
