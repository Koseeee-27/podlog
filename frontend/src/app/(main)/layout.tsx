"use client";

import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/layout/Navbar"), { ssr: false });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
