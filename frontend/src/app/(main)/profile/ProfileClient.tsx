"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/ui/Loading";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ProfileClient() {
  const auth = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.push("/login");
    } else if (auth.status === "no_profile") {
      router.push("/profile/setup");
    }
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return <Loading />;
  }

  const { profile } = auth;

  return (
    <div className="max-w-2xl mx-auto">
      <Card padding="lg">
        {editing ? (
          <ProfileEditForm
            user={profile}
            onSave={() => {
              setEditing(false);
              auth.refreshProfile();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <ProfileCard user={profile} />
            <div className="mt-6">
              <Button variant="outline" onClick={() => setEditing(true)}>
                プロフィールを編集
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
