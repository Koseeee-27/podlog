import Image from "next/image";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src: string | null;
  alt: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; className: string }> = {
  sm: { px: 32, className: "h-8 w-8" },
  md: { px: 40, className: "h-10 w-10" },
  lg: { px: 64, className: "h-16 w-16" },
  xl: { px: 96, className: "h-24 w-24" },
};

export default function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const { px, className: sizeClass } = sizeMap[size];

  if (!src) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold ${className}`}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={`${sizeClass} rounded-full object-cover ${className}`}
    />
  );
}
