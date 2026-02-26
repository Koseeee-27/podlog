import Avatar from "@/components/ui/Avatar";
import type { User } from "@/types/user";
import { formatDate } from "@/lib/utils";

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <Avatar src={user.avatar_url} alt={user.display_name} size="xl" />
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
        <p className="text-gray-500">@{user.username}</p>
        {user.bio && (
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">{user.bio}</p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          {formatDate(user.created_at)} に登録
        </p>
      </div>
    </div>
  );
}
