import type { FC } from "hono/jsx";

const NAV_ITEMS = [
  { href: "/admin", label: "基本設定" },
  { href: "/admin/boards", label: "板管理" },
  { href: "/admin/plugins", label: "プラグイン管理" },
  { href: "/admin/ngwords", label: "NGワード" },
  { href: "/admin/iprestrictions", label: "IP制限" },
  { href: "/admin/threads", label: "スレッド管理" },
  { href: "/admin/responses", label: "レス管理" },
  { href: "/admin/users", label: "ユーザー管理" },
  { href: "/admin/groups", label: "グループ管理" },
  { href: "/admin/ninpocho", label: "忍法帖管理" },
  { href: "/admin/failurelogs", label: "失敗ログ" },
  { href: "/admin/samba", label: "サンバ管理" },
  { href: "/admin/banners", label: "バナー管理" },
  { href: "/admin/notices", label: "お知らせ管理" },
  { href: "/admin/rebuild", label: "インデックス再構築" },
  { href: "/admin/update", label: "アップデート確認" },
  { href: "/admin/federation", label: "連合設定" },
  { href: "/admin/password", label: "パスワード変更" },
  { href: "/admin/autodelete", label: "自動削除設定" },
  { href: "/admin/archive", label: "アーカイブ管理" },
];

export const AdminNav: FC<{ currentPath?: string }> = ({ currentPath }) => (
  <nav className="flex gap-4 mb-6 flex-wrap">
    {NAV_ITEMS.map((item) => (
      <a
        href={item.href}
        className={`text-purple-600 hover:underline ${currentPath === item.href ? "font-semibold" : ""}`}
      >
        {item.label}
      </a>
    ))}
  </nav>
);
