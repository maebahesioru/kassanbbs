import type { Plugin } from "../types/PluginTypes";
import { PluginHookType } from "../types/PluginTypes";

const ERA_MAP: Array<{ name: string; startYear: number; startMonth: number; startDay: number }> = [
  { name: "令和", startYear: 2019, startMonth: 5, startDay: 1 },
  { name: "平成", startYear: 1989, startMonth: 1, startDay: 8 },
  { name: "昭和", startYear: 1926, startMonth: 12, startDay: 25 },
  { name: "大正", startYear: 1912, startMonth: 7, startDay: 30 },
  { name: "明治", startYear: 1868, startMonth: 1, startDay: 25 },
];

function getJapaneseEra(date: Date): string {
  for (const era of ERA_MAP) {
    const eraStart = new Date(era.startYear, era.startMonth - 1, era.startDay);
    if (date >= eraStart) {
      const year = date.getFullYear() - era.startYear + 1;
      return `${era.name}${year}年`;
    }
  }
  return `${date.getFullYear()}年`;
}

export const createEraPlugin = (): Plugin => ({
  id: "builtin-era",
  name: "和暦表示",
  description: "日付を和暦（令和、平成など）で表示します",
  hookTypes: [PluginHookType.READ_DISPLAY],
  isActive: false,

  async onReadDisplay(content: string): Promise<string> {
    return content.replace(
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
      (_match, year: string, month: string, day: string) => {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isNaN(date.getTime())) return _match;
        return `${getJapaneseEra(date)}${parseInt(month)}月${parseInt(day)}日`;
      }
    );
  },
});
