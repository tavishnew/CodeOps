import { Skeleton } from './ui/skeleton';

// Renamed the generic shell wrappers to semantic loading regions without changing their layout.
function SidebarSkeleton() {
  return (
    <aside
      aria-label="Loading navigation"
      className="w-[280px] space-y-6 border-r border-border bg-background p-4"
      data-testid="dashboard-sidebar-skeleton"
    >
      <div className="flex items-center gap-3 px-2" data-testid="dashboard-logo-skeleton">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>

      <nav aria-label="Loading menu" className="space-y-2 px-2" data-testid="dashboard-menu-skeleton">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </nav>

      <footer className="absolute bottom-4 left-4 right-4" data-testid="dashboard-profile-skeleton">
        <div className="flex items-center gap-3 px-1">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-32" />
          </div>
        </div>
      </footer>
    </aside>
  );
}

function MainContentSkeleton() {
  return (
    <main
      aria-label="Loading dashboard content"
      className="flex-1 space-y-4 p-4"
      data-testid="dashboard-content-skeleton"
    >
      <Skeleton className="h-12 w-48 rounded-lg" />
      <section aria-label="Loading dashboard summary" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </section>
      <Skeleton className="h-64 rounded-xl" />
    </main>
  );
}

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background" data-testid="dashboard-layout-skeleton" role="status" aria-busy="true">
      <SidebarSkeleton />
      <MainContentSkeleton />
    </div>
  );
}
