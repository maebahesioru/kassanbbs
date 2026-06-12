import { err, ok } from "neverthrow";

import { getAllThreadsRepository } from "../../conversation/repositories/getAllThreadsRepository";
import { updateThreadPooledRepository } from "../../conversation/repositories/updateThreadPooledRepository";
import { createWriteThreadId } from "../../conversation/domain/write/WriteThreadId";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

const DEFAULT_SUBMAX = 500;

export const checkThreadCapacityUsecase = async (
  vakContext: VakContext,
  params?: { submax?: number }
): Promise<Result<{ archived: number }, Error>> => {
  const { logger } = vakContext;
  const submax = params?.submax ?? DEFAULT_SUBMAX;

  logger.info({
    operation: "checkThreadCapacity",
    submax,
    message: "Checking thread capacity",
  });

  const threadsResult = await getAllThreadsRepository(vakContext);
  if (threadsResult.isErr()) {
    logger.error({
      operation: "checkThreadCapacity",
      error: threadsResult.error,
      message: "Failed to fetch threads for capacity check",
    });
    return err(threadsResult.error);
  }

  const threads = threadsResult.value;

  const activeThreads = threads.filter(
    (t) => !t.isPooled && !t.isStopped
  );

  if (activeThreads.length <= submax) {
    logger.info({
      operation: "checkThreadCapacity",
      activeCount: activeThreads.length,
      submax,
      message: "Thread capacity is within limits",
    });
    return ok({ archived: 0 });
  }

  const overflow = activeThreads.length - submax;

  logger.warn({
    operation: "checkThreadCapacity",
    activeCount: activeThreads.length,
    submax,
    overflow,
    message: "Thread capacity exceeded, archiving oldest threads",
  });

  const toArchive = activeThreads
    .filter((t) => !t.attrs.sticky && !t.attrs.noPool)
    .sort(
      (a, b) =>
        new Date(a.postedAt.val).getTime() -
        new Date(b.postedAt.val).getTime()
    )
    .slice(0, overflow);

  let archived = 0;

  for (const thread of toArchive) {
    const writeThreadIdResult = createWriteThreadId(thread.id.val);
    if (writeThreadIdResult.isErr()) {
      logger.error({
        operation: "checkThreadCapacity",
        error: writeThreadIdResult.error,
        threadId: thread.id.val,
        message: "Failed to create thread ID for archiving",
      });
      continue;
    }

    const poolResult = await updateThreadPooledRepository(vakContext, {
      threadId: writeThreadIdResult.value,
      isPooled: true,
    });

    if (poolResult.isErr()) {
      logger.error({
        operation: "checkThreadCapacity",
        error: poolResult.error,
        threadId: thread.id.val,
        message: "Failed to archive thread",
      });
      continue;
    }

    await addAdminLogRepository(vakContext, {
      action: "容量超過アーカイブ",
      detail: `スレッドID: ${thread.id.val} を容量超過によりアーカイブしました`,
      ipAddress: "system",
      logType: "HST",
    });

    archived++;
  }

  logger.info({
    operation: "checkThreadCapacity",
    archived,
    overflow,
    message: "Thread capacity check completed",
  });

  return ok({ archived });
};
