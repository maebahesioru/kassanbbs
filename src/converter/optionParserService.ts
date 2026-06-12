export type ParsedOption = {
  isLast: boolean;
  start: number;
  end: number;
  hideFirst: boolean;
  isSingle: boolean;
};

export const parseReadOption = (opt: string): ParsedOption => {
  const option = opt ?? "";

  const result: ParsedOption = {
    isLast: false,
    start: -1,
    end: -1,
    hideFirst: false,
    isSingle: false,
  };

  const latestNoFirstMatch = option.match(/l(\d+)n/);
  if (latestNoFirstMatch) {
    result.isLast = true;
    result.start = parseInt(latestNoFirstMatch[1], 10) + 1;
    result.end = parseInt(latestNoFirstMatch[1], 10) + 1;
    result.hideFirst = true;
    return result;
  }

  const latestMatch = option.match(/^l(\d+)$/);
  if (latestMatch && parseInt(latestMatch[1], 10) > 0) {
    result.isLast = true;
    result.start = parseInt(latestMatch[1], 10);
    result.end = parseInt(latestMatch[1], 10);
    result.hideFirst = false;
    return result;
  }

  const rangeNoFirstMatch = option.match(/^(\d+)-(\d+)n$/);
  if (rangeNoFirstMatch) {
    result.start = parseInt(rangeNoFirstMatch[1], 10);
    result.end = parseInt(rangeNoFirstMatch[2], 10);
    result.hideFirst = true;
    return result;
  }

  const rangeMatch = option.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    result.start = parseInt(rangeMatch[1], 10);
    result.end = parseInt(rangeMatch[2], 10);
    result.hideFirst = false;
    return result;
  }

  const openEndNoFirstMatch = option.match(/^(\d+)-n$/);
  if (openEndNoFirstMatch) {
    result.start = parseInt(openEndNoFirstMatch[1], 10);
    result.end = -1;
    result.hideFirst = true;
    return result;
  }

  const openEndMatch = option.match(/^(\d+)-$/);
  if (openEndMatch) {
    result.start = parseInt(openEndMatch[1], 10);
    result.end = -1;
    result.hideFirst = false;
    return result;
  }

  const toMatch = option.match(/^-(\d+)$/);
  if (toMatch) {
    result.start = 1;
    result.end = parseInt(toMatch[1], 10);
    result.hideFirst = false;
    return result;
  }

  const singleNoFirstMatch = option.match(/^(\d+)n$/);
  if (singleNoFirstMatch) {
    result.start = parseInt(singleNoFirstMatch[1], 10);
    result.end = parseInt(singleNoFirstMatch[1], 10);
    result.hideFirst = true;
    result.isSingle = true;
    return result;
  }

  const singleMatch = option.match(/^(\d+)$/);
  if (singleMatch) {
    result.start = parseInt(singleMatch[1], 10);
    result.end = parseInt(singleMatch[1], 10);
    result.hideFirst = true;
    result.isSingle = true;
    return result;
  }

  return result;
};
