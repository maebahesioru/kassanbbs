const urlPattern = /(?<!a href=")(?<!src=")(https?|ftp):\/\/(([-\w.!~*'();\/?:\@=_+\$,%#]|&(?![lg]t;))+)/gi;
const urlBracketPattern = /<(https?|ftp)::(([-\w.!~*'();\/?:\@=_+\$,%#]|&(?![lg]t;))+)>/g;
const youtubeShortPattern = /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/g;
const youtubeFullPattern = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g;
const nicoMsPattern = /https?:\/\/nico\.ms\/sm([0-9]+)/g;
const nicoFullPattern = /https?:\/\/(?:www\.)?nicovideo\.jp\/watch\/sm([0-9]+)/g;
const twitterPattern = /<a.*?>(https?:\/\/(?:twitter|x)(?:\.com\/[A-Za-z0-9_]+)\/status\/([0-9]+)\/?)/g;
const quotationRangePattern = /&gt;&gt;([1-9][0-9]*)-([1-9][0-9]*)/g;
const quotationOpenRangePattern = /&gt;&gt;([1-9][0-9]*)-(?!0)/g;
const quotationFromStartPattern = /&gt;&gt;-([1-9][0-9]*)/g;
const quotationSinglePattern = /&gt;&gt;([1-9][0-9]*)/g;
const imageExt = /(jpe?g|gif|bmp|a?png|tiff?|xcf|webp)/i;
const imageUrlPattern = new RegExp(`(?<!src="?)https?://.*?\\.${imageExt.source}`, 'gi');
const imageUrlTrustedPattern = new RegExp(`(?<!src="?)https?://(i\\.imgur\\.com/[a-zA-Z0-9]{7}|pbs\\.twimg\\.com/media/[a-zA-Z0-9]{15})\\.${imageExt.source}`, 'gi');
const imageLinkPattern = new RegExp(`<a.*?>(.*?\\.${imageExt.source})`, 'gi');
const imageLinkTrustedPattern = new RegExp(`<a.*?>(https?://(i\\.imgur\\.com/[a-zA-Z0-9]{7}|pbs\\.twimg\\.com/media/[a-zA-Z0-9]{15})\\.${imageExt.source})`, 'gi');
const threadTitlePattern = /\Q$server$cgipath\E\/read\.cgi\/([0-9a-zA-Z_\-]+)\/([0-9]+)\/?([0-9\-]+)?\//;

export const convertUrl = (text: string, options: {
  cushion?: string;
  server?: string;
  isMobile?: boolean;
}): string => {
  if (options.isMobile) {
    let result = text.replace(urlPattern, '<$1::$2>');
    while (urlBracketPattern.test(result)) {
      result = result.replace(urlBracketPattern, (_, protocol, rest) => {
        const work = rest.split('/')[0].replace(/(www\.|\.com|\.net|\.jp|\.co|\.ne)/g, '');
        return `<a href="${protocol}://${rest}">${work}</a>`;
      });
    }
    result = result.replace(/\s*<br>/g, '<br>');
    result = result.replace(/(?:<br>){2}/g, '<br>');
    result = result.replace(/(?:<br>){3,}/g, '<br><br>');
    return result;
  }

  if (options.cushion && options.server) {
    const serverMatch = options.server.match(urlPattern);
    const serverDomain = serverMatch ? serverMatch[2] : '';
    let result = text.replace(urlPattern, '<$1::$2>');
    while (urlBracketPattern.test(result)) {
      result = result.replace(urlBracketPattern, (_, protocol, rest) => {
        if (new RegExp(`^\\Q${serverDomain}\\E(?:/|$)`).test(rest)) {
          return `<a href="${protocol}://${rest}" target="_blank">${protocol}://${rest}</a>`;
        }
        if (options.cushion!.match(/^(?:jump\.x0\.to|nun\.nu)\/$/)) {
          return `<a href="http://${options.cushion}${protocol}://${rest}" target="_blank">${protocol}://${rest}</a>`;
        }
        return `<a href="${protocol}://${options.cushion}${rest}" target="_blank">${protocol}://${rest}</a>`;
      });
    }
    return result;
  }

  return text.replace(urlPattern, '<a href="$1://$2" target="_blank">$1://$2</a>');
};

const movieEmbedPrefix = '<div class="video"><div class="video_iframe"><iframe width="560" height="315" src=';
const movieEmbedSuffix = 'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div></div>';

export const convertMovie = (text: string): string => {
  return text
    .replace(youtubeShortPattern, `${movieEmbedPrefix}"https://www.youtube.com/embed/$1"${movieEmbedSuffix}`)
    .replace(youtubeFullPattern, `${movieEmbedPrefix}"https://www.youtube.com/embed/$1"${movieEmbedSuffix}`)
    .replace(nicoMsPattern, `${movieEmbedPrefix}"https://embed.nicovideo.jp/watch/sm$1"${movieEmbedSuffix}`)
    .replace(nicoFullPattern, `${movieEmbedPrefix}"https://embed.nicovideo.jp/watch/sm$1"${movieEmbedSuffix}`);
};

export const convertTweet = (text: string): string => {
  return text.replace(twitterPattern, '<a href="$1">$1</a><br><blockquote class="twitter-tweet" data-width="300"><a href="https://twitter.com/i/web/status/$2">Tweet読み込み中...</a></blockquote>');
};

export const convertQuotation = (text: string, options: {
  server: string;
  cgiPath: string;
  bbs: string;
  key: string;
  usePathInfo?: boolean;
}): string => {
  const pathCGI = `${options.server}${options.cgiPath}`;
  const baseHref = options.usePathInfo
    ? `${pathCGI}/read.cgi/${options.bbs}/${options.key}`
    : `${pathCGI}/read.cgi?bbs=${options.bbs}&key=${options.key}&nofirst=true`;

  let result = text;
  if (options.usePathInfo) {
    result = result.replace(quotationRangePattern, `<a class="reply_link" href="${baseHref}/$1-$2n" target="_blank">>>$1-$2</a>`);
    result = result.replace(quotationOpenRangePattern, `<a class="reply_link" href="${baseHref}/$1-" target="_blank">>>$1-</a>`);
    result = result.replace(quotationFromStartPattern, `<a class="reply_link" href="${baseHref}/-$1" target="_blank">>>-$1</a>`);
    result = result.replace(quotationSinglePattern, `<a class="reply_link" href="${baseHref}/$1" target="_blank">>>$1</a>`);
  } else {
    result = result.replace(quotationRangePattern, `<a class="reply_link" href="${baseHref}&st=$1&to=$2" target="_blank">>>$1-$2</a>`);
    result = result.replace(quotationOpenRangePattern, `<a class="reply_link" href="${baseHref}&st=$1&to=-1" target="_blank">>>$1-</a>`);
    result = result.replace(quotationFromStartPattern, `<a class="reply_link" href="${baseHref}&st=1&to=$1" target="_blank">>>-$1</a>`);
    result = result.replace(quotationSinglePattern, `<a class="reply_link" href="${baseHref}&st=$1&to=$1" target="_blank">>>$1</a>`);
  }
  result = result.replace(/>>(?=[1-9])/g, '&gt;&gt;');
  return result;
};

export const convertSpecialQuotation = (text: string): string => {
  let result = `<br>${text}<br>`;
  const grayQuotePattern = /<br> ＞(.*?)<br>/g;
  while (grayQuotePattern.test(result)) {
    result = result.replace(grayQuotePattern, '<br><font color=gray>＞$1</font><br>');
  }
  const greenQuoteFullPattern = /<br> ＃(.*?)<br>/g;
  while (greenQuoteFullPattern.test(result)) {
    result = result.replace(greenQuoteFullPattern, '<br><font color=green>＃$1</font><br>');
  }
  const greenQuoteHalfPattern = /<br> #(.*?)<br>/g;
  while (greenQuoteHalfPattern.test(result)) {
    result = result.replace(greenQuoteHalfPattern, '<br><font color=green>#$1</font><br>');
  }
  result = result.substring(4, result.length - 4);
  return result;
};

export const convertThreadTitle = (text: string, options: {
  server: string;
  cgiPath: string;
}): string => {
  const escapedServer = options.server.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedCgiPath = options.cgiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<=\\>)${escapedServer}${escapedCgiPath}/read\\.cgi/([0-9a-zA-Z_\\-]+)/([0-9]+)/?([0-9\\-]+)?/?`, 'g');
  return text.replace(pattern, (match, bbs, thread, optionsPart) => {
    return optionsPart ? `/${bbs}/${thread} >>${optionsPart}` : match;
  });
};

export const convertImageTag = (text: string, options?: {
  limit?: boolean;
  onlyTrustedDomains?: boolean;
}): string => {
  if (options?.limit || options?.onlyTrustedDomains) {
    const pattern = options?.onlyTrustedDomains ? imageLinkTrustedPattern : imageLinkPattern;
    return text.replace(pattern, '<a href="$1">$1</a><br><img class="post_image" src="$1" style="max-width:250px;max-height:250px;">');
  }
  const pattern = options?.onlyTrustedDomains ? imageUrlTrustedPattern : imageUrlPattern;
  return text.replace(pattern, '<a href="$1">$1</a><br><img class="post_image" src="$1" style="max-width:250px;max-height:250px;">');
};

const sanitizeHref = (html: string): string => {
  return html
    .replace(/href="javascript:/gi, 'href="disabled-javascript:')
    .replace(/href="data:/gi, 'href="disabled-data:')
    .replace(/href="vbscript:/gi, 'href="disabled-vbscript:');
};

export const convertAll = (text: string, context: {
  server: string;
  cgiPath: string;
  bbs: string;
  key: string;
  usePathInfo?: boolean;
  cushion?: string;
  isMobile?: boolean;
}): string => {
  let result = text;
  result = convertSpecialQuotation(result);
  result = convertQuotation(result, {
    server: context.server,
    cgiPath: context.cgiPath,
    bbs: context.bbs,
    key: context.key,
    usePathInfo: context.usePathInfo,
  });
  result = convertImageTag(result);
  result = convertMovie(result);
  result = convertTweet(result);
  result = convertUrl(result, {
    cushion: context.cushion,
    server: context.server,
    isMobile: context.isMobile,
  });
  result = convertThreadTitle(result, {
    server: context.server,
    cgiPath: context.cgiPath,
  });
  result = sanitizeHref(result);
  return result;
};
