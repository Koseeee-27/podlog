interface GreetingSectionProps {
  displayName: string;
}

export default function GreetingSection({ displayName }: GreetingSectionProps) {
  return (
    <section className="py-4">
      <h1 className="text-2xl font-bold text-stone-900">
        {displayName} さん、こんにちは
      </h1>
    </section>
  );
}
