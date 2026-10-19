import { Skeleton } from "@/components/ui/skeleton";

export default function BookingLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10" role="status" aria-label="Cargando">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-20 rounded-2xl" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="mt-6 h-24" />
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
    </div>
  );
}
