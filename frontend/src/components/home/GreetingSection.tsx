"use client";

import { useAuth } from "@/hooks/useAuth";

export default function GreetingSection() {
  const auth = useAuth();

  if (auth.status !== "authenticated") {
    return null;
  }

  const displayName = auth.profile.display_name;

  return (
    <section className="py-4">
      <h1 className="text-2xl font-bold text-stone-900">
        {displayName} さん、こんにちは
      </h1>
    </section>
  );
}
