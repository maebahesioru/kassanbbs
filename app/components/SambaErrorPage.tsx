import type { SambaErrorCodeType } from "../../src/error/sambaErrorCodes";
import { sambaTo2chCode } from "../../src/error/sambaErrorCodes";

export const SambaErrorPage = ({ errorCode, message }: { errorCode: SambaErrorCodeType; message: string }) => {
  return (
    <main className="container mx-auto flex-grow py-8 px-4">
      <section className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-md p-10 text-center">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">{errorCode}</h1>
        <h2 className="text-xl text-red-800 dark:text-red-300 mb-2">
          {errorCode} / 2ch: {sambaTo2chCode(errorCode)}
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mt-4">{message}</p>
      </section>
    </main>
  );
};
