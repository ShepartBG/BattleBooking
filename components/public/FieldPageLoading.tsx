import { GameCardSkeleton, SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";

export default function FieldPageLoading() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="overflow-hidden rounded-[2.6rem] border border-[#95c900]/22 bg-black/60 backdrop-blur-xl">
        <div className="relative min-h-[360px] bg-[radial-gradient(circle_at_left,rgba(149,201,0,.22),transparent_38%),linear-gradient(90deg,rgba(0,0,0,.88),rgba(0,0,0,.45),rgba(0,0,0,.78))]">
          <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 md:p-10">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border border-[#95c900]/25 bg-black/75 shadow-[0_0_45px_rgba(0,0,0,.65)]">
              <img
                src="/battlebooking-mark.png"
                alt="BattleBooking"
                className="h-16 w-16 animate-pulse object-contain"
              />
            </div>
            <SkeletonLine className="h-9 w-56" />
            <SkeletonLine className="mt-5 h-16 w-full max-w-3xl" />
            <SkeletonLine className="mt-5 h-6 w-full max-w-2xl" />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
          <SkeletonLine className="h-9 w-44" />
          <div className="mt-5 space-y-3">
            <SkeletonBox className="h-20" />
            <SkeletonBox className="h-20" />
            <SkeletonBox className="h-20" />
            <SkeletonBox className="h-20" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
          <SkeletonLine className="h-9 w-56" />
          <div className="mt-5 grid gap-4">
            <GameCardSkeleton />
            <GameCardSkeleton />
          </div>
        </div>
      </div>
    </section>
  );
}
