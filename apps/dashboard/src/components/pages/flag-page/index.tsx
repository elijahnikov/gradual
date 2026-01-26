import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import MainFlagView from "./main-flag-view";

export default function FlagPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/",
  });

  return (
    <div className="h-full">
      <Suspense fallback={<div>Loading...</div>}>
        <MainFlagView
          flagSlug={params.flagSlug}
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
