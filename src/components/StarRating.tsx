import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating as StarRatingType } from "@/types/premium";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: StarRatingType) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value as StarRatingType);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          disabled={readonly}
          className={cn(
            "transition-all",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
          aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              value <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

