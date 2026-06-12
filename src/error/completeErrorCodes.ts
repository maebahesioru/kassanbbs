export const ErrorCodes = {
  // Form validation errors (100-161)
  FORM_LONGSUBJECT: { code: 100, msg: "タイトルが長すぎます" },
  FORM_LONGNAME: { code: 101, msg: "名前が長すぎます" },
  FORM_LONGMAIL: { code: 102, msg: "メールアドレスが長すぎます" },
  FORM_LONGTEXT: { code: 103, msg: "本文が長すぎます" },
  FORM_LONGLINE: { code: 104, msg: "1行の文字数が長すぎます" },
  FORM_MANYLINE: { code: 105, msg: "行数が多すぎます" },
  FORM_MANYANCHOR: { code: 106, msg: "アンカーが多すぎます" },
  FORM_NOSUBJECT: { code: 150, msg: "タイトルを入力してください" },
  FORM_NONAME: { code: 151, msg: "名前を入力してください" },
  FORM_NOMAIL: { code: 152, msg: "メールアドレスを入力してください" },
  FORM_NOMESSAGE: { code: 153, msg: "本文を入力してください" },
  FORM_NOCAPTCHA: { code: 154, msg: "キャプチャを入力してください" },
  FORM_FAILEDCAPTCHA: { code: 155, msg: "キャプチャが間違っています" },
  FORM_FAILEDAUTH: { code: 156, msg: "認証コードが間違っています" },
  FORM_EXPIREDUSERAUTH: { code: 157, msg: "認証コードの有効期限が切れています" },
  FORM_AUTHCOMMAND: { code: 158, msg: "認証コードを発行しました" },
  FORM_SAVECOMMAND: { code: 159, msg: "セーブコードを発行しました" },
  FORM_NOPASSWORD: { code: 160, msg: "パスワードを入力してください" },
  FORM_WRONGPASSWORD: { code: 161, msg: "パスワードが間違っています" },

  // Thread limit errors (200-208)
  THREAD_STOPPED: { code: 200, msg: "このスレッドは書き込み禁止です" },
  THREAD_OVERMAXRES: { code: 201, msg: "このスレッドはレス数上限に達しました" },
  THREAD_MOVED: { code: 202, msg: "スレッドは別の板に移動しました" },
  THREAD_READONLY: { code: 203, msg: "この板は読み取り専用です" },
  MOBILE_THREAD_RESTRICTED: { code: 204, msg: "モバイルからのスレッド作成は制限されています" },
  CGI_FORBIDDEN: { code: 205, msg: "現在書き込みを停止しています" },
  OVER_DAT_SIZE: { code: 206, msg: "スレッドのサイズが上限を超えました" },
  NOT_JP_HOST: { code: 207, msg: "日本国外からの投稿は制限されています" },
  NO_REVERSE_DNS: { code: 208, msg: "ホストが確認できませんでした" },

  // Image upload errors (300-302)
  IMG_NONE: { code: 300, msg: "画像が指定されていません" },
  IMG_FAILED: { code: 301, msg: "画像のアップロードに失敗しました" },
  IMG_FILESIZE: { code: 302, msg: "画像ファイルサイズが制限を超えました" },

  // Regulation errors (500-603)
  REG_MANYTHREAD: { code: 500, msg: "スレッド作成が多すぎます" },
  REG_NOBREAKPOST: { code: 501, msg: "連続投稿はご遠慮ください" },
  REG_DOUBLEPOST: { code: 502, msg: "同じ内容の投稿があります" },
  REG_NOTIMEPOST: { code: 503, msg: "一定時間内の投稿が多すぎます" },
  REG_NOTIMEGLOBAL: { code: 504, msg: "一定時間内の投稿が多すぎます（全体）" },
  SAMBA_CAUTION: { code: 505, msg: "投稿が制限されています" },
  SAMBA_WARNING: { code: 506, msg: "投稿が警告されています" },
  SAMBA_LISTED: { code: 507, msg: "規制中です" },
  SAMBA_BANNED: { code: 508, msg: "利用停止中です" },
  // 2ch-compatible samba codes
  SAMBA_2CH_CAUTION: { code: 593, msg: "投稿が制限されています" },
  SAMBA_2CH_LISTED: { code: 594, msg: "規制中です" },
  SAMBA_2CH_WARNING: { code: 599, msg: "投稿が警告されています" },
  REG_NGWORD: { code: 600, msg: "NGワードが含まれています" },
  REG_NGUSER: { code: 601, msg: "投稿が制限されています" },
  REG_SPAMKILL: { code: 602, msg: "スパムと判定されました" },
  REG_SAMETITLE: { code: 603, msg: "同じタイトルのスレッドがあります" },

  // Ban errors (700-701)
  BANNED: { code: 700, msg: "このユーザーはBANされています" },
  NINPOCHO_LEVEL_LIMIT: { code: 701, msg: "忍法帖レベルが不足しています" },

  // BE errors (890-894)
  BE_GET_FAILED: { code: 890, msg: "BEプロフィールの取得に失敗しました" },
  BE_CONNECT_FAILED: { code: 891, msg: "BEサーバーに接続できませんでした" },
  BE_LOGIN_FAILED: { code: 892, msg: "BEログインに失敗しました" },
  BE_MUST_LOGIN: { code: 893, msg: "BEログインが必要です" },
  BE_MUST_LOGIN2: { code: 894, msg: "BEログインが必要です(再確認)" },

  // Thread system errors (900-902)
  THREAD_NOT_FOUND: { code: 900, msg: "スレッドが見つかりません" },
  THREAD_REMOVED: { code: 901, msg: "スレッドは削除されました" },
  THREAD_IN_POOL: { code: 902, msg: "スレッドは過去ログにあります" },

  // Post errors (950-999)
  POST_NO_PRODUCT: { code: 950, msg: "製品情報が取得できませんでした" },
  POST_INVALID_REFERER: { code: 951, msg: "リファラが不正です" },
  POST_INVALID_FORM: { code: 952, msg: "フォームが不正です" },
  POST_LOCKED: { code: 953, msg: "投稿処理がロックされています" },
  POST_INVALID_TOKEN: { code: 954, msg: "トークンが不正です" },

  // Read errors (1001-3004)
  READ_NOT_FOUND: { code: 1001, msg: "該当するレスが見つかりません" },
  READ_LIMTIME: { code: 1002, msg: "現在スレッドを読むことができません" },
  READ_INVALID_RANGE: { code: 1003, msg: "指定された範囲が不正です" },
  READ_NOT_ALLOWED: { code: 1004, msg: "このスレッドを読むことはできません" },

  // System errors (990-991)
  SYSTEM_DB_ERROR: { code: 990, msg: "データベースエラーが発生しました" },
  CAPTCHA_CONFIG_ERROR: { code: 991, msg: "CAPTCHAの設定に問題があります" },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCodes;
export type ErrorCodeValue = (typeof ErrorCodes)[ErrorCodeKey];

export const getErrorCodeByKey = (key: ErrorCodeKey): ErrorCodeValue => {
  return ErrorCodes[key];
};
