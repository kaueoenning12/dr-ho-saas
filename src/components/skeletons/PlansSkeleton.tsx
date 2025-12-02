import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PlansSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>

      <Card className="border-cyan/50 shadow-cyan/10 shadow-xl">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>

        <CardHeader className="text-center pt-8">
          <div className="mb-4">
            <Skeleton className="h-12 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>

        <div className="px-6 pb-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-3 w-48 mx-auto mt-2" />
        </div>
      </Card>
    </div>
  );
}












