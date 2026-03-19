import { ShieldCheckIcon } from "@heroicons/react/20/solid";

/**
 * 管理者バッジコンポーネント
 * is_admin が true のユーザーの横に表示するための小さなバッジ
 */
export default function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-600 text-xs font-medium px-2 py-0.5 rounded-full">
      <ShieldCheckIcon className="w-3 h-3" aria-hidden="true" />
      管理者
    </span>
  );
}
