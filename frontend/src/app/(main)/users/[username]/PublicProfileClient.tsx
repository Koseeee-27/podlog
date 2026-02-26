"use client";

import { useParams } from "next/navigation";
import { usePublicProfile } from "@/hooks/useProfile";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function PublicProfileClient() {
  const params = useParams();
  const username = params.username as string;
  const { profile, loading, error } = usePublicProfile(username);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!profile) {
    return <ErrorMessage message="ユーザーが見つかりません" />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar src={profile.avatar_url} alt={profile.display_name} size="xl" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {formatDate(profile.created_at)} に登録
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
