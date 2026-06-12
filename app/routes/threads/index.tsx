import { createRoute } from "honox/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import { checkIpAccessUsecase } from "../../../src/access/usecases/checkIpAccessUsecase";
import { checkVpnUsecase } from "../../../src/vpn/usecases/checkVpnUsecase";
import { checkDnsblUsecase } from "../../../src/dnsbl/usecases/checkDnsblUsecase";
import { checkProxyUsecase } from "../../../src/proxy/usecases/checkProxyUsecase";
import { getUserEntriesRepository } from "../../../src/user/repositories/getUserEntriesRepository";
import { checkUserAccess } from "../../../src/user/services/userAccessChecker";
import { verifyCaptchaUsecase } from "../../../src/captcha/usecases/verifyCaptchaUsecase";
import { issueAuthTokenUsecase } from "../../../src/auth/usecases/issueAuthTokenUsecase";
import { verifyAuthTokenUsecase } from "../../../src/auth/usecases/verifyAuthTokenUsecase";
import { postThreadUsecase } from "../../../src/conversation/usecases/postThreadUsecase";
import { checkNinpochoUsecase } from "../../../src/ninpocho/usecases/checkNinpochoUsecase";
import { recordNinpochoViolationUsecase } from "../../../src/ninpocho/usecases/recordNinpochoViolationUsecase";
import { generateNinpochoHashId } from "../../../src/ninpocho/utils/generateNinpochoHashId";
import { checkSambaUsecase } from "../../../src/samba/usecases/checkSambaUsecase";
import { recordSambaViolationUsecase } from "../../../src/samba/usecases/recordSambaViolationUsecase";
import { checkThreadRateLimitUsecase } from "../../../src/ratelimit/usecases/checkThreadRateLimitUsecase";
import { checkThreadCapacityUsecase } from "../../../src/overflow/usecases/checkThreadCapacityUsecase";
import { checkRegulationBypassUsecase } from "../../../src/cap/usecases/checkRegulationBypassUsecase";
import { CapPermission, getPermissionValue } from "../../../src/cap/services/permissionService";
import { PluginRegistry } from "../../../src/plugin/core/PluginRegistry";
import { PluginHookType } from "../../../src/plugin/types/PluginTypes";
import { executePreWritePlugins, executeThreadCreatePlugins } from "../../../src/plugin/usecases/executePluginHooksUsecase";
import { generateSlip, generateWattyoi } from "../../../src/slip/services/slipService";
import { processFormText } from "../../../src/utils/formTextProcessor";
import { logHostUsecase } from "../../../src/hostlog/usecases/logHostUsecase";
import { ErrorMessage } from "../../components/ErrorMessage";
import { SambaErrorPage } from "../../components/SambaErrorPage";
import { SambaErrorCode } from "../../../src/error/sambaErrorCodes";
import { addAdminLogUsecase } from "../../../src/adminlog/usecases/addAdminLogUsecase";
import { logFailureUsecase } from "../../../src/failurelog/usecases/logFailureUsecase";
import { ErrorCodes } from "../../../src/error/completeErrorCodes";
import { getIpAddress } from "../../utils/getIpAddress";
import { getUserCookieData, setUserCookieData, setAuthTokenCookieData } from "../../utils/userCookieManager";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const startTime = performance.now();
  const { sql, logger } = c.var;

  logger.info({
    operation: "threads/POST",
    path: c.req.path,
    method: c.req.method,
    message: "Starting new thread creation request"
  });

  const body = await c.req.parseBody();
  const rawTitle = body.title;
  const rawName = typeof body.name === "string" ? body.name : null;
  const rawMail = typeof body.mail === "string" ? body.mail : null;
  const rawContent = body.content;
  const browserFp = typeof body.browser_fp === "string" ? body.browser_fp : null;

  const title = typeof rawTitle === "string" ? processFormText(rawTitle) : rawTitle;
  const name = rawName ? processFormText(rawName) : rawName;
  const mail = rawMail ?? "";
  const content = typeof rawContent === "string" ? processFormText(rawContent) : rawContent;

  const ipAddressRaw = getIpAddress(c);
  const remoteHost = ipAddressRaw;
  const userAgent = c.req.header("User-Agent") ?? "";

  logger.debug({
    operation: "threads/POST",
    hasTitle: typeof title === "string",
    hasContent: typeof content === "string",
    hasName: name !== null,
    hasMail: mail !== null,
    message: "Request body parsed for thread creation"
  });

  if (typeof title !== "string" || typeof content !== "string") {
    logger.warn({
      operation: "threads/POST",
      validationError: "Missing required fields",
      hasTitle: typeof title === "string",
      hasContent: typeof content === "string",
      message: "Thread creation validation failed - missing required fields"
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.CGI_FORBIDDEN.code,
        errorMessage: "必須フィールド不足",
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <ErrorMessage error={new Error("タイトルと本文は必須です")} />
    );
  }

  const acceptLanguage = c.req.header("Accept-Language") ?? "";
  const securityKey = import.meta.env.VITE_SECURITY_KEY ?? "changeme";
  if (securityKey === "changeme") {
    console.warn("VITE_SECURITY_KEY is set to 'changeme' or unset - this is insecure!");
  }
  const wattyoi = generateWattyoi(ipAddressRaw, remoteHost, userAgent, securityKey, "vvvvv");
  const slip = generateSlip(ipAddressRaw, userAgent, acceptLanguage);
  
  logger.debug({
    operation: "threads/POST",
    ipAddress: ipAddressRaw,
    message: "IP address extracted for thread creation"
  });

  let capUsername: string | null = null;
  try {
    const jwtToken = getCookie(c, "jwt");
    if (jwtToken) {
      const secret = import.meta.env.VITE_JWT_SECRET_KEY;
      if (secret) {
        const payload = await verify(jwtToken, secret);
        capUsername = (payload as Record<string, unknown>).username as string ?? null;
      }
    }
  } catch {
    capUsername = null;
  }

  let bypassNinpocho = false;
  let bypassSamba = false;
  let bypassRateLimit = false;
  let bypassHost = false;
  let bypassCaptcha = false;
  let bypassNgword = false;
  let bypassSpam = false;

  if (capUsername) {
    const [ninpochoBypass, sambaBypass, ratelimitBypass, hostBypass, captchaBypass, ngwordBypassResult] = await Promise.all([
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.noninja") ?? CapPermission.REG_NONINJA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.samba") ?? CapPermission.REG_SAMBA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.notimepost") ?? CapPermission.REG_NOTIMEPOST }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.nohost") ?? CapPermission.REG_NOHOST }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.nocaptcha") ?? CapPermission.REG_NOCAPTCHA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.ngword") ?? CapPermission.REG_NGWORD }),
    ]);
    bypassNinpocho = ninpochoBypass.isOk() && ninpochoBypass.value;
    bypassSamba = sambaBypass.isOk() && sambaBypass.value;
    bypassRateLimit = ratelimitBypass.isOk() && ratelimitBypass.value;
    bypassHost = hostBypass.isOk() && hostBypass.value;
    bypassCaptcha = captchaBypass.isOk() && captchaBypass.value;
    bypassNgword = ngwordBypassResult.isOk() && ngwordBypassResult.value;
    bypassSpam = bypassNgword;
  }

  const ninpochoHashId = generateNinpochoHashId(ipAddressRaw);

  if (!bypassNinpocho) {
  const ninpochoCheckResult = await checkNinpochoUsecase(
    { sql, logger },
    { hashId: ninpochoHashId, ipAddress: ipAddressRaw }
  );
  if (ninpochoCheckResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: ninpochoCheckResult.error,
      message: "Ninpocho check failed",
    });
    return c.render(<ErrorMessage error={ninpochoCheckResult.error} />);
  }
  if (!ninpochoCheckResult.value.allowed) {
    logger.warn({
      operation: "threads/POST",
      reason: ninpochoCheckResult.value.reason,
      hashId: ninpochoHashId,
      ipAddress: ipAddressRaw,
      message: "Thread creation blocked by ninpocho",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.BANNED.code,
        errorMessage: ninpochoCheckResult.value.reason || "アクセスが禁止されています",
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <SambaErrorPage errorCode={SambaErrorCode.BANNED} message={ninpochoCheckResult.value.reason || "アクセスが禁止されています"} />
    );
  }
  } else {
    logger.info({
      operation: "threads/POST",
      message: "Ninpocho check bypassed by cap permission",
    });
  }

  if (!bypassSamba) {
  const sambaCheckResult = await checkSambaUsecase(
    { sql, logger },
    { hostIdentifier: ipAddressRaw, isLiveMode: false }
  );
  if (sambaCheckResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: sambaCheckResult.error,
      message: "Samba check failed",
    });
    return c.render(<ErrorMessage error={sambaCheckResult.error} />);
  }
  if (!sambaCheckResult.value.allowed) {
    logger.warn({
      operation: "threads/POST",
      level: sambaCheckResult.value.level,
      sambaCode: sambaCheckResult.value.sambaCode,
      reason: sambaCheckResult.value.reason,
      ipAddress: ipAddressRaw,
      message: "Thread creation blocked by samba",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: sambaCheckResult.value.sambaCode,
        errorMessage: sambaCheckResult.value.reason,
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <SambaErrorPage errorCode={sambaCheckResult.value.sambaCode} message={sambaCheckResult.value.reason} />
    );
  }
  } else {
    logger.info({
      operation: "threads/POST",
      message: "Samba check bypassed by cap permission",
    });
  }

  if (!bypassRateLimit) {
  const rateLimitResult = await checkThreadRateLimitUsecase(
    { sql, logger },
    { hostIdentifier: ipAddressRaw }
  );
  if (rateLimitResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: rateLimitResult.error,
      message: "Thread rate limit check failed",
    });
    return c.render(<ErrorMessage error={rateLimitResult.error} />);
  }
  if (!rateLimitResult.value.allowed) {
    logger.warn({
      operation: "threads/POST",
      reason: rateLimitResult.value.reason,
      ipAddress: ipAddressRaw,
      message: "Thread creation blocked by rate limit",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: SambaErrorCode.BANNED,
        errorMessage: rateLimitResult.value.reason || "スレッド作成制限中です",
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <SambaErrorPage errorCode={SambaErrorCode.BANNED} message={rateLimitResult.value.reason || "スレッド作成制限中です"} />
    );
  }
  } else {
    logger.info({
      operation: "threads/POST",
      message: "Rate limit check bypassed by cap permission",
    });
  }

  if (!bypassHost) {
  const ipAccessResult = await checkIpAccessUsecase(
    { sql, logger },
    ipAddressRaw
  );
  if (ipAccessResult.isErr()) {
    logger.warn({
      operation: "threads/POST",
      error: ipAccessResult.error,
      ipAddress: ipAddressRaw,
      message: "IP access denied for thread creation"
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NOT_JP_HOST.code,
        errorMessage: ipAccessResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.BANNED} message={ipAccessResult.error.message} />);
  }

  const userEntriesResult = await getUserEntriesRepository({ sql, logger });
  if (userEntriesResult.isOk()) {
    const userCheck = checkUserAccess(userEntriesResult.value, {
      ip: ipAddressRaw,
      hostname: remoteHost,
      userAgent,
      sessionId: getCookie(c, "session") ?? "",
    });
    if (!userCheck.allowed) {
      logger.warn({
        operation: "threads/POST",
        ipAddress: ipAddressRaw,
        method: userCheck.method,
        reason: userCheck.reason,
        message: "User access denied for thread creation",
      });
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CGI_FORBIDDEN.code,
          errorMessage: userCheck.reason || "アクセスが制限されています",
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: remoteHost,
          threadKey: "NEW_THREAD",
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      if (userCheck.method === "tate") {
        return c.render(<SambaErrorPage errorCode={SambaErrorCode.BANNED} message="スレッド作成が制限されています" />);
      }
      return c.render(<SambaErrorPage errorCode={SambaErrorCode.BANNED} message={userCheck.reason || "アクセスが制限されています"} />);
    }
  }

  const vpnResult = await checkVpnUsecase(
    { sql, logger },
    ipAddressRaw
  );
  if (vpnResult.isErr()) {
    logger.warn({
      operation: "threads/POST",
      error: vpnResult.error,
      ipAddress: ipAddressRaw,
      message: "VPN detection blocked thread creation"
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NO_REVERSE_DNS.code,
        errorMessage: vpnResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.BANNED} message={vpnResult.error.message} />);
  }

  const dnsblResult = await checkDnsblUsecase(
    { sql, logger },
    ipAddressRaw
  );
  if (dnsblResult.isErr()) {
    logger.warn({
      operation: "threads/POST",
      error: dnsblResult.error,
      ipAddress: ipAddressRaw,
      message: "DNSBL check blocked thread creation"
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NOT_JP_HOST.code,
        errorMessage: dnsblResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.LISTED} message={dnsblResult.error.message} />);
  }

  const proxyResult = await checkProxyUsecase({ sql, logger }, ipAddressRaw);
  if (proxyResult.isOk() && proxyResult.value.isProxy && proxyResult.value.risk > 5) {
    logger.warn({
      operation: "threads/POST",
      ipAddress: ipAddressRaw,
      risk: proxyResult.value.risk,
      message: "Proxy check blocked thread creation",
    });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.CAUTION} message="プロキシ/VPN経由のスレッド作成は禁止されています" />);
  }
  } else {
    logger.info({
      operation: "threads/POST",
      message: "Host/IP/VPN/DNSBL checks bypassed by cap permission",
    });
  }

  let captchaBypassed = bypassCaptcha;
  let authTokenIssued: string | null = null;

  if (!captchaBypassed) {
  const authTokenResult = await verifyAuthTokenUsecase(
    { sql, logger },
    { mail, ipAddress: ipAddressRaw }
  );
  if (authTokenResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: authTokenResult.error,
      message: "Auth token verification failed",
    });
  } else if (authTokenResult.value) {
    captchaBypassed = true;
    logger.info({
      operation: "threads/POST",
      message: "Captcha bypassed via auth token",
    });
  }
  }

  if (!captchaBypassed) {
    const captchaToken = typeof body["cf-turnstile-response"] === "string" ? body["cf-turnstile-response"]
      : typeof body["g-recaptcha-response"] === "string" ? body["g-recaptcha-response"]
      : typeof body["h-captcha-response"] === "string" ? body["h-captcha-response"]
      : null;
    const captchaResult = await verifyCaptchaUsecase(
      { sql, logger },
      captchaToken
    );
    if (captchaResult.isErr()) {
      logger.warn({
        operation: "threads/POST",
        error: captchaResult.error,
        ipAddress: ipAddressRaw,
        message: "Captcha verification failed for thread creation"
      });
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CAPTCHA_CONFIG_ERROR.code,
          errorMessage: captchaResult.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content: typeof content === "string" ? content : "",
          ipAddress: ipAddressRaw,
          host: remoteHost,
          threadKey: "NEW_THREAD",
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      return c.render(<SambaErrorPage errorCode={SambaErrorCode.CAUTION} message={captchaResult.error.message} />);
    }

    const sessionId = c.req.header("User-Agent") ?? "unknown";
    const issuedTokenResult = await issueAuthTokenUsecase(
      { sql, logger },
      { ipAddress: ipAddressRaw, sessionId }
    );
    if (issuedTokenResult.isOk()) {
      authTokenIssued = issuedTokenResult.value;
      logger.info({
        operation: "threads/POST",
        message: "Auth token issued",
      });
    }
  }

  const pluginRegistry = PluginRegistry.getInstance();

  const preWritePlugins = pluginRegistry.getPluginsByHookType(PluginHookType.PRE_WRITE);
  const preWriteResult = await executePreWritePlugins(preWritePlugins, {
    title,
    authorName: name ?? "",
    content,
    mail: mail ?? "",
  });
  if (preWriteResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: preWriteResult.error,
      message: "Pre-write plugin execution failed",
    });
    return c.render(<ErrorMessage error={preWriteResult.error} />);
  }
  if (!preWriteResult.value.allowed) {
    logger.warn({
      operation: "threads/POST",
      reason: preWriteResult.value.reason,
      message: "Thread creation blocked by pre-write plugin",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.CGI_FORBIDDEN.code,
        errorMessage: preWriteResult.value.reason || "投稿が拒否されました",
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<ErrorMessage error={new Error(preWriteResult.value.reason || "投稿が拒否されました")} />);
  }

  const threadCreatePlugins = pluginRegistry.getPluginsByHookType(PluginHookType.THREAD_CREATE);
  const modifiedResult = await executeThreadCreatePlugins(threadCreatePlugins, {
    title,
    authorName: name ?? "",
    content,
  });
  let finalTitle = title;
  let finalName = name;
  let finalContent: string = content;
  if (modifiedResult.isOk()) {
    finalTitle = modifiedResult.value.title;
    finalName = modifiedResult.value.authorName || null;
    finalContent = modifiedResult.value.content;
  }

  const boardId = c.get("boardId");

  const postThreadResult = await postThreadUsecase(
    { sql, logger },
    {
      threadTitleRaw: finalTitle,
      authorNameRaw: finalName,
      mailRaw: mail,
      responseContentRaw: finalContent,
      ipAddressRaw,
      browserFpRaw: browserFp,
      remoteHost,
      userAgent,
      bypassNgword,
      bypassSpam,
      wattyoi,
      boardId,
    }
  );
  if (postThreadResult.isErr()) {
    logger.error({
      operation: "threads/POST",
      error: postThreadResult.error,
      message: "Thread creation failed in usecase layer"
    });

    const errorMsg = postThreadResult.error.message;
    if (
      errorMsg.includes("\u30B9\u30D1\u30E0") ||
      errorMsg.includes("NG\u30EF\u30FC\u30C9")
    ) {
      await recordNinpochoViolationUsecase(
        { sql, logger },
        { hashId: ninpochoHashId, ipAddress: ipAddressRaw }
      );
      await recordSambaViolationUsecase(
        { sql, logger },
        { hostIdentifier: ipAddressRaw, isLiveMode: false }
      );
      await addAdminLogUsecase(
        { sql, logger },
        {
          action: "\u30B9\u30D1\u30E0\u30D6\u30ED\u30C3\u30AF",
          detail: `\u30B9\u30D1\u30E0/\u30CD\u30B8\u30A7\u30AF\u30C8: ${errorMsg}`,
          ipAddress: ipAddressRaw,
          logType: "SMB",
        }
      );
    }

    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.CGI_FORBIDDEN.code,
        errorMessage: errorMsg,
        name: name ?? "",
        mail: mail ?? "",
        content: typeof content === "string" ? content : "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: "NEW_THREAD",
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });

    return c.render(<ErrorMessage error={postThreadResult.error} />);
  }
  const threadId = postThreadResult.value.val;
  
  logHostUsecase(
    { sql, logger },
    {
      host: remoteHost,
      ipAddress: ipAddressRaw,
      hashId: generateNinpochoHashId(ipAddressRaw),
      userAgent,
    }
  ).catch((err: unknown) => {
    logger.error({
      operation: "threads/POST",
      error: err,
      message: "Host log failed (non-blocking)",
    });
  });
  
  checkThreadCapacityUsecase({ sql, logger }).catch((err) => {
    logger.error({
      operation: "threads/POST",
      error: err,
      message: "Thread capacity check failed (non-blocking)",
    });
  });
  
  if (name !== null || mail !== null) {
    setUserCookieData(c, { name: name ?? "", mail: mail ?? "" });
  }
  if (authTokenIssued) {
    setAuthTokenCookieData(c, authTokenIssued);
  }
  
  logger.info({
    operation: "threads/POST",
    threadId,
    message: "Thread created successfully, redirecting to thread page"
  });

  const elapsed = performance.now() - startTime;
  if (elapsed > 1000) {
    addAdminLogUsecase({ sql, logger }, {
      action: "CGI_TIME",
      detail: `bbs.cgi execution: ${elapsed.toFixed(0)}ms /threads`,
      ipAddress: ipAddressRaw,
      logType: "ERR",
    }).catch((err) => { console.error("Async operation failed:", err); });
  }
  
  return c.redirect(`/threads/${threadId}`, 303);
});

export default createRoute((c) => {
  const { logger } = c.var;
  
  logger.debug({
    operation: "threads/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Thread index page requested, redirecting to home page"
  });
  
  return c.redirect("/", 302);
});
