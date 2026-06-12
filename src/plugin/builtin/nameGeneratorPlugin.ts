import type { Plugin } from "../types/PluginTypes";
import { PluginHookType } from "../types/PluginTypes";

const RANDOM_NAMES = [
  "774@774", "名無しの権兵衛", "通りすがり", "あぼーん", "削除しました",
  "anonymous", "guest", "ひまつぶし", "夜更かしさん", "早起きさん",
  "紅茶", "コーヒー", "お茶", "ジュース", "牛乳",
  "春", "夏", "秋", "冬", "風",
];

export const createNameGeneratorPlugin = (): Plugin => ({
  id: "builtin-namegen",
  name: "名無しランダム",
  description: "名無しの場合にランダムな名前を生成します",
  hookTypes: [PluginHookType.RESPONSE_POST, PluginHookType.THREAD_CREATE],
  isActive: false,

  async onResponsePost(params) {
    if (!params.authorName || params.authorName === "") {
      const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      return { ...params, authorName: randomName };
    }
    return params;
  },

  async onThreadCreate(params) {
    if (!params.authorName || params.authorName === "") {
      const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      return { ...params, authorName: randomName };
    }
    return params;
  },
});
