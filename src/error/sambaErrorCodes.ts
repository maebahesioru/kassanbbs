export const SambaErrorCode = {
  CAUTION: 505,
  WARNING: 506,
  LISTED: 507,
  BANNED: 508,
} as const;

export type SambaErrorCodeType = typeof SambaErrorCode[keyof typeof SambaErrorCode];

export const Samba2chCode = {
  SAMBA_2CH_CAUTION: 593,
  SAMBA_2CH_WARNING: 599,
  SAMBA_2CH_LISTED: 594,
} as const;

export const sambaTo2chCode = (sambaCode: SambaErrorCodeType): number => {
  switch (sambaCode) {
    case SambaErrorCode.CAUTION: return Samba2chCode.SAMBA_2CH_CAUTION;
    case SambaErrorCode.WARNING: return Samba2chCode.SAMBA_2CH_WARNING;
    case SambaErrorCode.LISTED:
    case SambaErrorCode.BANNED: return Samba2chCode.SAMBA_2CH_LISTED;
    default: return sambaCode;
  }
};

export const sambaErrorMessages: Record<SambaErrorCodeType, string> = {
  [SambaErrorCode.CAUTION]: "投稿が制限されています。しばらく時間をおいてください。",
  [SambaErrorCode.WARNING]: "連続投稿が制限されています。時間をおいて再度お試しください。",
  [SambaErrorCode.LISTED]: "このホストは規制中です。規制が解除されるまでお待ちください。",
  [SambaErrorCode.BANNED]: "このホストからの投稿は停止されています。",
};
