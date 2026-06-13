import { createRoute } from "honox/factory";

import { getGoldRankingUsecase } from "../../src/gold/usecases/goldRankingUsecase";
import { ErrorMessage } from "../components/ErrorMessage";

export default createRoute(async (c) => {
  const { sql, logger } = c.var;

  const rankingResult = await getGoldRankingUsecase({ sql, logger }, { limit: 50 });

  if (rankingResult.isErr()) {
    return c.render(<ErrorMessage error={rankingResult.error} />);
  }

  const entries = rankingResult.value;

  return c.render(
    <main className="container mx-auto flex-grow py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">ゴールドランキング</h1>
        {entries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">ランキングデータがありません</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2 w-16">順位</th>
                <th className="text-left py-2 px-2">ユーザー</th>
                <th className="text-right py-2 px-2">ゴールド</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.hashId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 px-2 font-bold">{entry.rank}</td>
                  <td className="py-2 px-2 font-mono text-sm">{entry.hashId}</td>
                  <td className="py-2 px-2 text-right font-bold text-amber-600">{entry.gold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
});
