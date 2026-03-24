import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecordClient from "./RecordClient";

export default async function RecordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <RecordClient />;
}
