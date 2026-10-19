import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-20 w-16 shrink-0" />)}
      </div>
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
    </div>
  );
}
