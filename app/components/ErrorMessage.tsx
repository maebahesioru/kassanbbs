import ErrorRedirect from "../islands/ErrorRedirect";
import { SambaErrorCode } from "../../src/error/sambaErrorCodes";

import type { SambaErrorCodeType } from "../../src/error/sambaErrorCodes";

export const ErrorMessage = ({ error, sambaCode, errorCode }: { error: Error; sambaCode?: SambaErrorCodeType; errorCode?: number }) => {
  if (sambaCode !== undefined) {
    return (
      <main className="container mx-auto flex-grow py-8 px-4">
        <section className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-md p-10 text-center">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">{sambaCode}</h1>
          <h2 className="text-xl text-red-800 dark:text-red-300 mb-4">
            {sambaCode === SambaErrorCode.CAUTION ? "投稿注意" :
             sambaCode === SambaErrorCode.WARNING ? "投稿警告" :
             sambaCode === SambaErrorCode.LISTED ? "規制中" : "利用停止"}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error.message}</p>
          <button
            onClick={() => history.back()}
            className="text-blue-500 dark:text-blue-400 hover:underline mt-4"
          >
            戻る
          </button>
          <ErrorRedirect />
        </section>
      </main>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {errorCode && <span className="text-4xl font-bold text-red-600 dark:text-red-400">{errorCode}</span>}
      <p className="text-red-500 dark:text-red-400 text-lg font-bold">エラーが発生しました</p>
      <p className="text-gray-700 dark:text-gray-300">{error.message}</p>
      <button
        onClick={() => history.back()}
        className="text-blue-500 dark:text-blue-400 hover:underline mt-4"
      >
        戻る
      </button>
      <ErrorRedirect />
    </div>
  );
};
