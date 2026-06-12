import { ok } from "neverthrow";

import { checkProxyApi } from "../services/proxyCheckService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkProxyUsecase = async (
  vakContext: VakContext,
  ipAddress: string
): Promise<Result<{ isProxy: boolean; risk: number }, Error>> => {
  const { logger } = vakContext;

  const proxyApiKey = import.meta.env.VITE_PROXYCHECK_API_KEY as string | undefined;

  if (!proxyApiKey) {
    logger.debug({
      operation: "checkProxyUsecase",
      message: "Proxy check API key not configured, skipping",
    });
    return ok({ isProxy: false, risk: 0 });
  }

  try {
    const result = await checkProxyApi(ipAddress, proxyApiKey);
    logger.info({
      operation: "checkProxyUsecase",
      ipAddress,
      isProxy: result.isProxy,
      risk: result.risk,
      message: "Proxy check completed",
    });
    return ok({ isProxy: result.isProxy, risk: result.risk });
  } catch (error) {
    logger.error({
      operation: "checkProxyUsecase",
      error,
      ipAddress,
      message: "Proxy check failed",
    });
    return ok({ isProxy: false, risk: 0 });
  }
};
