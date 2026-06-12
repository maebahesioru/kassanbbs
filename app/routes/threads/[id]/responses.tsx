import { createRoute } from "honox/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import { checkIpAccessUsecase } from "../../../../src/access/usecases/checkIpAccessUsecase";
import { checkVpnUsecase } from "../../../../src/vpn/usecases/checkVpnUsecase";
import { checkDnsblUsecase } from "../../../../src/dnsbl/usecases/checkDnsblUsecase";
import { checkProxyUsecase } from "../../../../src/proxy/usecases/checkProxyUsecase";
import { getUserEntriesRepository } from "../../../../src/user/repositories/getUserEntriesRepository";
import { checkUserAccess } from "../../../../src/user/services/userAccessChecker";
import { verifyCaptchaUsecase } from "../../../../src/captcha/usecases/verifyCaptchaUsecase";
import { issueAuthTokenUsecase } from "../../../../src/auth/usecases/issueAuthTokenUsecase";
import { verifyAuthTokenUsecase } from "../../../../src/auth/usecases/verifyAuthTokenUsecase";
import { postResponseByThreadIdUsecase } from "../../../../src/conversation/usecases/postResponseByThreadIdUsecase";
import { checkNinpochoUsecase } from "../../../../src/ninpocho/usecases/checkNinpochoUsecase";
import { recordNinpochoViolationUsecase } from "../../../../src/ninpocho/usecases/recordNinpochoViolationUsecase";
import { generateNinpochoHashId } from "../../../../src/ninpocho/utils/generateNinpochoHashId";
import { checkSambaUsecase } from "../../../../src/samba/usecases/checkSambaUsecase";
import { recordSambaViolationUsecase } from "../../../../src/samba/usecases/recordSambaViolationUsecase";
import { checkRegulationBypassUsecase } from "../../../../src/cap/usecases/checkRegulationBypassUsecase";
import { CapPermission, getPermissionValue } from "../../../../src/cap/services/permissionService";
import { PluginRegistry } from "../../../../src/plugin/core/PluginRegistry";
import { PluginHookType } from "../../../../src/plugin/types/PluginTypes";
import { executePreWritePlugins, executeResponsePostPlugins } from "../../../../src/plugin/usecases/executePluginHooksUsecase";
import { generateWattyoi } from "../../../../src/slip/services/slipService";
import { processFormText } from "../../../../src/utils/formTextProcessor";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { SambaErrorPage } from "../../../components/SambaErrorPage";
import { SambaErrorCode } from "../../../../src/error/sambaErrorCodes";
import { addAdminLogUsecase } from "../../../../src/adminlog/usecases/addAdminLogUsecase";
import { logFailureUsecase } from "../../../../src/failurelog/usecases/logFailureUsecase";
import { ErrorCodes } from "../../../../src/error/completeErrorCodes";
import { logHostUsecase } from "../../../../src/hostlog/usecases/logHostUsecase";
import { getIpAddress } from "../../../utils/getIpAddress";
import { getUserCookieData, setUserCookieData, setAuthTokenCookieData } from "../../../utils/userCookieManager";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const POST = createRoute(async (c) => {
  const startTime = performance.now();
  const { sql, logger } = c.var;
  const id = c.req.param("id");

  logger.info({
    operation: "threads/[id]/responses/POST",
    path: c.req.path,
    method: c.req.method,
    threadId: id,
    message: "Response creation request received",
  });

  if (!id) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      message: "Thread ID not specified in request",
    });
    return c.render(
      <ErrorMessage error={new Error("スレッドIDが指定されていません")} />
    );
  }

  const body = await c.req.parseBody();
  const rawName = typeof body.name === "string" ? body.name : null;
  const rawMail = typeof body.mail === "string" ? body.mail : null;
  const rawContent = body.content;
  const browserFp = typeof body.browser_fp === "string" ? body.browser_fp : null;
  const password = typeof body.password === "string" && body.password !== "" ? body.password : null;

  const name = rawName ? processFormText(rawName) : rawName;
  const mail = rawMail ?? "";
  const content = typeof rawContent === "string" ? processFormText(rawContent) : rawContent;

  const ipAddressRaw = getIpAddress(c);
  const remoteHost = ipAddressRaw;
  const userAgent = c.req.header("User-Agent") ?? "";
  const securityKey = import.meta.env.VITE_SECURITY_KEY ?? "changeme";
  const wattyoi = generateWattyoi(ipAddressRaw, remoteHost, userAgent, securityKey, "vvvvv");

  logger.debug({
    operation: "threads/[id]/responses/POST",
    threadId: id,
    hasName: name !== null,
    hasMail: mail !== null,
    hasContent: typeof content === "string",
    hasPassword: password !== null,
    message: "Request body parsed for response creation",
  });

  // もし文字列じゃなかったらエラーを返す
  if (typeof content !== "string") {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      threadId: id,
      contentType: typeof content,
      message: "Response content is missing or invalid",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.CGI_FORBIDDEN.code,
        errorMessage: "本文は必須です",
        name: name ?? "",
        mail: mail ?? "",
        content: "",
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<ErrorMessage error={new Error("本文は必須です")} />);
  }

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
  let bypassHost = false;
  let bypassCaptcha = false;
  let bypassNgword = false;
  let bypassSpam = false;
  let bypassAttr = false;
  let bypassCommand = false;

  if (capUsername) {
    const [
      ninpochoBypass,
      sambaBypass,
      hostBypass,
      captchaBypass,
      ngwordBypassResult,
      attrBypass,
      commandBypass,
    ] = await Promise.all([
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.noninja") ?? CapPermission.REG_NONINJA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.samba") ?? CapPermission.REG_SAMBA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.nohost") ?? CapPermission.REG_NOHOST }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.nocaptcha") ?? CapPermission.REG_NOCAPTCHA }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.ngword") ?? CapPermission.REG_NGWORD }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.noattr") ?? CapPermission.REG_NOATTR }),
      checkRegulationBypassUsecase({ sql, logger }, { username: capUsername, permissionType: getPermissionValue("reg.command") ?? CapPermission.REG_COMMAND }),
    ]);
    bypassNinpocho = ninpochoBypass.isOk() && ninpochoBypass.value;
    bypassSamba = sambaBypass.isOk() && sambaBypass.value;
    bypassHost = hostBypass.isOk() && hostBypass.value;
    bypassCaptcha = captchaBypass.isOk() && captchaBypass.value;
    bypassNgword = ngwordBypassResult.isOk() && ngwordBypassResult.value;
    bypassSpam = bypassNgword;
    bypassAttr = attrBypass.isOk() && attrBypass.value;
    bypassCommand = commandBypass.isOk() && commandBypass.value;
  }

  const ninpochoHashId = generateNinpochoHashId(ipAddressRaw);

  if (!bypassNinpocho) {
  const ninpochoCheckResult = await checkNinpochoUsecase(
    { sql, logger },
    { hashId: ninpochoHashId, ipAddress: ipAddressRaw }
  );
  if (ninpochoCheckResult.isErr()) {
    logger.error({
      operation: "threads/[id]/responses/POST",
      error: ninpochoCheckResult.error,
      threadId: id,
      message: "Ninpocho check failed",
    });
    return c.render(<ErrorMessage error={ninpochoCheckResult.error} />);
  }
  if (!ninpochoCheckResult.value.allowed) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      reason: ninpochoCheckResult.value.reason,
      hashId: ninpochoHashId,
      ipAddress: ipAddressRaw,
      threadId: id,
      message: "Response creation blocked by ninpocho",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.BANNED.code,
        errorMessage: ninpochoCheckResult.value.reason || "アクセスが禁止されています",
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <SambaErrorPage errorCode={SambaErrorCode.BANNED} message={ninpochoCheckResult.value.reason || "アクセスが禁止されています"} />
    );
  }
  } else {
    logger.info({
      operation: "threads/[id]/responses/POST",
      threadId: id,
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
      operation: "threads/[id]/responses/POST",
      error: sambaCheckResult.error,
      threadId: id,
      message: "Samba check failed",
    });
    return c.render(<ErrorMessage error={sambaCheckResult.error} />);
  }
  if (!sambaCheckResult.value.allowed) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      level: sambaCheckResult.value.level,
      sambaCode: sambaCheckResult.value.sambaCode,
      reason: sambaCheckResult.value.reason,
      ipAddress: ipAddressRaw,
      threadId: id,
      message: "Response creation blocked by samba",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: sambaCheckResult.value.sambaCode,
        errorMessage: sambaCheckResult.value.reason,
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(
      <SambaErrorPage errorCode={sambaCheckResult.value.sambaCode} message={sambaCheckResult.value.reason} />
    );
  }
  } else {
    logger.info({
      operation: "threads/[id]/responses/POST",
      threadId: id,
      message: "Samba check bypassed by cap permission",
    });
  }

  if (!bypassHost) {
  const ipAccessResult = await checkIpAccessUsecase(
    { sql, logger },
    ipAddressRaw
  );
  if (ipAccessResult.isErr()) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      error: ipAccessResult.error,
      ipAddress: ipAddressRaw,
      threadId: id,
      message: "IP access denied for response creation",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NOT_JP_HOST.code,
        errorMessage: ipAccessResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
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
        operation: "threads/[id]/responses/POST",
        ipAddress: ipAddressRaw,
        method: userCheck.method,
        reason: userCheck.reason,
        threadId: id,
        message: "User access denied for response creation",
      });
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CGI_FORBIDDEN.code,
          errorMessage: userCheck.reason || "アクセスが制限されています",
          name: name ?? "",
          mail: mail ?? "",
          content,
          ipAddress: ipAddressRaw,
          host: remoteHost,
          threadKey: id,
          userAgent,
        }
      ).catch((err) => { console.error("Async operation failed:", err); });
      if (userCheck.method === "disable") {
        return c.render(<SambaErrorPage errorCode={SambaErrorCode.BANNED} message="書き込みが制限されています" />);
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
      operation: "threads/[id]/responses/POST",
      error: vpnResult.error,
      ipAddress: ipAddressRaw,
      threadId: id,
      message: "VPN detection blocked response creation",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NO_REVERSE_DNS.code,
        errorMessage: vpnResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
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
      operation: "threads/[id]/responses/POST",
      error: dnsblResult.error,
      ipAddress: ipAddressRaw,
      threadId: id,
      message: "DNSBL check blocked response creation",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.NOT_JP_HOST.code,
        errorMessage: dnsblResult.error.message,
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.LISTED} message={dnsblResult.error.message} />);
  }

  const proxyResult = await checkProxyUsecase({ sql, logger }, ipAddressRaw);
  if (proxyResult.isOk() && proxyResult.value.isProxy && proxyResult.value.risk > 5) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      ipAddress: ipAddressRaw,
      risk: proxyResult.value.risk,
      message: "Proxy check blocked response creation",
    });
    return c.render(<SambaErrorPage errorCode={SambaErrorCode.CAUTION} message="プロキシ/VPN経由の投稿は禁止されています" />);
  }
  } else {
    logger.info({
      operation: "threads/[id]/responses/POST",
      threadId: id,
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
      operation: "threads/[id]/responses/POST",
      error: authTokenResult.error,
      message: "Auth token verification failed",
    });
  } else if (authTokenResult.value) {
    captchaBypassed = true;
    logger.info({
      operation: "threads/[id]/responses/POST",
      message: "Captcha bypassed via auth token",
    });
  }
  } else {
    logger.info({
      operation: "threads/[id]/responses/POST",
      threadId: id,
      message: "Captcha check bypassed by cap permission",
    });
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
        operation: "threads/[id]/responses/POST",
        error: captchaResult.error,
        ipAddress: ipAddressRaw,
        threadId: id,
        message: "Captcha verification failed for response creation",
      });
      logFailureUsecase(
        { sql, logger },
        {
          errorCode: ErrorCodes.CAPTCHA_CONFIG_ERROR.code,
          errorMessage: captchaResult.error.message,
          name: name ?? "",
          mail: mail ?? "",
          content,
          ipAddress: ipAddressRaw,
          host: remoteHost,
          threadKey: id,
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
        operation: "threads/[id]/responses/POST",
        message: "Auth token issued",
      });
    }
  }

  const pluginRegistry = PluginRegistry.getInstance();

  const preWritePlugins = pluginRegistry.getPluginsByHookType(PluginHookType.PRE_WRITE);
  const preWriteResult = await executePreWritePlugins(preWritePlugins, {
    authorName: name ?? "",
    content,
    mail: mail ?? "",
  });
  if (preWriteResult.isErr()) {
    logger.error({
      operation: "threads/[id]/responses/POST",
      error: preWriteResult.error,
      threadId: id,
      message: "Pre-write plugin execution failed",
    });
    return c.render(<ErrorMessage error={preWriteResult.error} />);
  }
  if (!preWriteResult.value.allowed) {
    logger.warn({
      operation: "threads/[id]/responses/POST",
      reason: preWriteResult.value.reason,
      threadId: id,
      message: "Response creation blocked by pre-write plugin",
    });
    logFailureUsecase(
      { sql, logger },
      {
        errorCode: ErrorCodes.CGI_FORBIDDEN.code,
        errorMessage: preWriteResult.value.reason || "投稿が拒否されました",
        name: name ?? "",
        mail: mail ?? "",
        content,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });
    return c.render(<ErrorMessage error={new Error(preWriteResult.value.reason || "投稿が拒否されました")} />);
  }

  const responsePostPlugins = pluginRegistry.getPluginsByHookType(PluginHookType.RESPONSE_POST);
  const modifiedResult = await executeResponsePostPlugins(responsePostPlugins, {
    authorName: name ?? "",
    content,
    mail: mail ?? "",
  });
  let finalName = name;
  let finalMail: string | null = mail;
  let finalContent: string = content;
  if (modifiedResult.isOk()) {
    finalName = modifiedResult.value.authorName || null;
    finalMail = modifiedResult.value.mail || null;
    finalContent = modifiedResult.value.content;
  }

  // レス番号(responseNumber)は自動で振られるので、渡す必要はない
  // 整合性とレイヤ分離のトレードオフだが、ロジックとして重要な部分なので整合性を優先した
  logger.debug({
    operation: "threads/[id]/responses/POST",
    threadId: id,
    message: "Calling postResponseByThreadIdUsecase",
  });

  const responseResult = await postResponseByThreadIdUsecase(
    { sql, logger },
    {
      threadIdRaw: id,
      authorNameRaw: finalName,
      mailRaw: finalMail,
      responseContentRaw: finalContent,
      ipAddressRaw,
      passwordRaw: password,
      hasCapPermission: bypassCommand || bypassAttr || bypassNgword,
      remoteHost,
      userAgent,
      bypassNgword,
      bypassSpam,
      bypassAttr,
      bypassCommand,
      wattyoi,
    }
  );
  if (responseResult.isErr()) {
    logger.error({
      operation: "threads/[id]/responses/POST",
      threadId: id,
      error: responseResult.error,
      message: "Failed to create response",
    });

    const errorMsg = responseResult.error.message;
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
        name: finalName ?? "",
        mail: finalMail ?? "",
        content: finalContent,
        ipAddress: ipAddressRaw,
        host: remoteHost,
        threadKey: id,
        userAgent,
      }
    ).catch((err) => { console.error("Async operation failed:", err); });

    return c.render(<ErrorMessage error={responseResult.error} />);
  }

  logger.info({
    operation: "threads/[id]/responses/POST",
    threadId: id,
    message: "Response created successfully, redirecting to thread page",
  });

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
      operation: "threads/[id]/responses/POST",
      error: err,
      message: "Host log failed (non-blocking)",
    });
  });

  if (name !== null || mail !== null) {
    setUserCookieData(c, { name: name ?? "", mail: mail ?? "" });
  }
  if (authTokenIssued) {
    setAuthTokenCookieData(c, authTokenIssued);
  }

  const { threadId } = responseResult.value;

  const elapsed = performance.now() - startTime;
  if (elapsed > 1000) {
    addAdminLogUsecase({ sql, logger }, {
      action: "CGI_TIME",
      detail: `bbs.cgi execution: ${elapsed.toFixed(0)}ms /threads/${id}/responses`,
      ipAddress: ipAddressRaw,
      logType: "ERR",
    }).catch((err) => { console.error("Async operation failed:", err); });
  }

  return c.redirect(`/threads/${threadId.val}/l50`, 303);
});

export default createRoute((c) => {
  const { logger } = c.var;

  logger.warn({
    operation: "threads/[id]/responses/GET",
    path: c.req.path,
    method: c.req.method,
    message: "Invalid method for response endpoint, GET method not supported",
  });

  return c.render(
    <ErrorMessage error={new Error("POSTメソッドでアクセスしてください")} />
  );
});
