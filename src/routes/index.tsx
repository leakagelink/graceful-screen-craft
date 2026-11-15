import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const VahakamApp = lazy(() => import("@/VahakamApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vahakam — Book Trucks, Track Trips" },
      { name: "description", content: "Vahakam connects shippers, truck drivers and admins: book loads, make offers, track deliveries." },
      { property: "og:title", content: "Vahakam — Book Trucks, Track Trips" },
      { property: "og:description", content: "Book loads, make offers and track deliveries in one app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loader />}>
      <Suspense fallback={<Loader />}>
        <VahakamApp />
      </Suspense>
    </ClientOnly>
  );
}
