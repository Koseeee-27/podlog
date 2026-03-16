import Navbar from "@/components/layout/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] sm:pb-6">{children}</main>
    </div>
  );
}
