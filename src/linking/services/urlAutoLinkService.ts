export const autoLinkUrls = (
  text: string,
  referrerCushion?: string
): string => {
  const urlRegex = /(https?:\/\/[^\s<>"'|]+)/gi;

  return text.replace(urlRegex, (url) => {
    let cleanUrl = url.replace(/[.,;:!?)\]}>]+$/, "");
    const suffix = url.substring(cleanUrl.length);

    if (referrerCushion) {
      const cushionUrl = referrerCushion.replace(
        "{URL}",
        encodeURIComponent(cleanUrl)
      );
      return `<a href="${cushionUrl}" target="_blank" rel="nofollow noopener noreferrer" class="text-blue-600 hover:underline break-all">${cleanUrl}</a>${suffix}`;
    }

    return `<a href="${cleanUrl}" target="_blank" rel="nofollow noopener noreferrer" class="text-blue-600 hover:underline break-all">${cleanUrl}</a>${suffix}`;
  });
};
