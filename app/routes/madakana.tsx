import { createRoute } from "honox/factory";

import { getIpRestrictionsRepository } from "../../src/access/repositories/getIpRestrictionsRepository";
import { getNinpochoConfigRepository } from "../../src/ninpocho/repositories/getNinpochoConfigRepository";
import { getNinpochoRecordRepository } from "../../src/ninpocho/repositories/getNinpochoRecordRepository";
import { ipMatchesCidr } from "../../src/access/services/ipMatcherService";
import { ErrorMessage } from "../components/ErrorMessage";
import { getIpAddress } from "../utils/getIpAddress";

import type { IpRestriction } from "../../src/access/repositories/getIpRestrictionsRepository";
import type { ReadNinpochoConfig } from "../../src/ninpocho/domain/read/ReadNinpochoConfig";
import type { ReadNinpochoRecord } from "../../src/ninpocho/domain/read/ReadNinpochoRecord";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;
  const ipAddress = getIpAddress(c);

  if (!sql) {
    return c.render(
      <ErrorMessage error={new Error("DBに接続できませんでした")} />
    );
  }

  let denyRules: IpRestriction[] = [];
  let allowRules: IpRestriction[] = [];
  let ninpochoConfig: ReadNinpochoConfig | null = null;
  let ninpochoRecord: ReadNinpochoRecord | null = null;
  let activeBans: { type: string; detail: string }[] = [];

  const denyResult = await getIpRestrictionsRepository({ sql, logger }, "deny");
  if (denyResult.isOk()) {
    denyRules = denyResult.value;
    for (const rule of denyRules) {
      if (ipMatchesCidr(ipAddress, rule.ipOrCidr)) {
        activeBans.push({
          type: "IP拒否",
          detail: `IP「${ipAddress}」は拒否ルール「${rule.ipOrCidr}」に一致します (備考: ${rule.note || "なし"})`,
        });
      }
    }
  }

  const allowResult = await getIpRestrictionsRepository(
    { sql, logger },
    "allow"
  );
  if (allowResult.isOk()) {
    allowRules = allowResult.value;
  }

  const ninpochoConfigResult = await getNinpochoConfigRepository({
    sql,
    logger,
  });
  if (ninpochoConfigResult.isOk()) {
    ninpochoConfig = ninpochoConfigResult.value;
  }

  const ninpochoRecordResult = await getNinpochoRecordRepository(
    { sql, logger },
    { ipAddress }
  );
  if (ninpochoRecordResult.isOk() && ninpochoRecordResult.value) {
    ninpochoRecord = ninpochoRecordResult.value;
    const record = ninpochoRecord.val;
    if (
      record.banLevel > 0 &&
      record.banUntil &&
      record.banUntil > new Date()
    ) {
      activeBans.push({
        type: "忍法帖BAN",
        detail: `忍法帖レベル${record.banLevel}によりBAN中です (解除予定: ${record.banUntil.toLocaleString("ja-JP")})`,
      });
    }
  }

  const clientInfo = c.get("clientInfo");

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">規制情報</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          現在のアクセス制限状態を表示します
        </p>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            接続情報
          </h2>
          <table className="min-w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-bold text-gray-600 dark:text-gray-400 w-32">
                  IPアドレス
                </td>
                <td className="py-2 font-mono text-gray-800 dark:text-gray-200">
                  {ipAddress || "取得できません"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-bold text-gray-600 dark:text-gray-400">
                  デバイス
                </td>
                <td className="py-2 text-gray-800 dark:text-gray-200">
                  {clientInfo
                    ? clientInfo.deviceName
                    : "不明"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-bold text-gray-600 dark:text-gray-400">
                  スマートフォン
                </td>
                <td className="py-2 text-gray-800 dark:text-gray-200">
                  {clientInfo && clientInfo.isSmartphone
                    ? "はい"
                    : "いいえ"}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-bold text-gray-600 dark:text-gray-400">
                  フィーチャーフォン
                </td>
                <td className="py-2 text-gray-800 dark:text-gray-200">
                  {clientInfo && clientInfo.isFeaturePhone
                    ? "はい"
                    : "いいえ"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className={`rounded p-4 mb-6 ${
            activeBans.length > 0
              ? "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            アクティブな制限
          </h2>
          {activeBans.length === 0 ? (
            <p className="text-green-700 dark:text-green-300">
              現在、有効な制限はありません。通常通り投稿できます。
            </p>
          ) : (
            <div className="space-y-2">
              {activeBans.map((ban, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded p-3 border border-red-100"
                >
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 mb-1">
                    {ban.type}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{ban.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          IP制限一覧
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          設定されているIP制限ルールの一覧です。あなたのIPに一致するルールは太字で表示されます。
        </p>

        {denyRules.length === 0 && allowRules.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">IP制限は設定されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900">
                  <th className="p-2 text-left">IP/CIDR</th>
                  <th className="p-2 text-left">種別</th>
                  <th className="p-2 text-left">備考</th>
                  <th className="p-2 text-left">あなたのIPに一致</th>
                </tr>
              </thead>
              <tbody>
                {[...denyRules, ...allowRules].map((rule) => {
                  const matches = ipMatchesCidr(
                    ipAddress,
                    rule.ipOrCidr
                  );
                  return (
                    <tr
                      key={rule.id}
                      className={`border-t ${
                        matches ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="p-2 font-mono">
                        <span
                          className={
                            matches ? "font-bold" : ""
                          }
                        >
                          {rule.ipOrCidr}
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            rule.restrictionType === "deny"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          }`}
                        >
                          {rule.restrictionType === "deny"
                            ? "拒否"
                            : "許可"}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">
                        {rule.note}
                      </td>
                      <td className="p-2">
                        {matches ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                            一致
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ninpochoConfig && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            忍法帖情報
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">忍法帖の状態</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {ninpochoConfig.val.enabled ? "有効" : "無効"}
              </p>
            </div>
            {ninpochoRecord && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    エラー回数
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {ninpochoRecord.val.errorCount}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    BANレベル
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    レベル {ninpochoRecord.val.banLevel}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    BAN期限
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {ninpochoRecord.val.banUntil
                      ? ninpochoRecord.val.banUntil.toLocaleString(
                          "ja-JP"
                        )
                      : "なし"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    最終エラー日時
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {ninpochoRecord.val.lastErrorAt
                      ? ninpochoRecord.val.lastErrorAt.toLocaleString(
                          "ja-JP"
                        )
                      : "なし"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    初回記録日時
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {ninpochoRecord.val.firstSeenAt.toLocaleString(
                      "ja-JP"
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          {!ninpochoRecord && ninpochoConfig.val.enabled && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              このIPアドレスには忍法帖の記録がありません。
            </p>
          )}

          <details className="mt-4">
            <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:text-gray-300">
              忍法帖の設定詳細を表示
            </summary>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                レベル1:{" "}
                {ninpochoConfig.val.errorThreshold1}回のエラーで
                {ninpochoConfig.val.banDuration1Hours}時間BAN
              </p>
              <p>
                レベル2:{" "}
                {ninpochoConfig.val.errorThreshold2}回のエラーで
                {ninpochoConfig.val.banDuration2Hours}時間BAN
              </p>
              <p>
                レベル3:{" "}
                {ninpochoConfig.val.errorThreshold3}回のエラーで
                {ninpochoConfig.val.banDuration3Hours}時間BAN
              </p>
              <p>
                永続BAN:{" "}
                {ninpochoConfig.val.permanentBanThreshold}回のエラー
              </p>
              <p>
                エラー減衰:{" "}
                {ninpochoConfig.val.errorDecayHours}時間
              </p>
            </div>
          </details>
        </section>
      )}

      <div className="text-center">
        <a href="/" className="text-blue-500 dark:text-blue-400 hover:underline">
          掲示板に戻る
        </a>
      </div>
    </main>
  );
});
