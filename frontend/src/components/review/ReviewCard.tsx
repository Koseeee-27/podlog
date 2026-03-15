import Link from "next/link";
import type { ReviewItem } from "@/types/review";
import { formatDate, formatStars } from "@/lib/utils";

interface ReviewCardProps {
  review: ReviewItem;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
          {review.user.display_name.charAt(0)}
        </div>
        <div>
          <Link
            href={`/users/${review.user.username}`}
            className="text-sm font-medium text-stone-900 hover:text-rose-600"
          >
            {review.user.display_name}
          </Link>
          <p className="text-xs text-stone-500">{formatDate(review.created_at)}</p>
        </div>
        <div className="ml-auto text-sm text-yellow-500">
          {formatStars(review.rating)}
        </div>
      </div>
      {review.comment && (
        <p className="mt-3 text-sm text-stone-700 whitespace-pre-wrap">{review.comment}</p>
      )}
    </div>
  );
}
