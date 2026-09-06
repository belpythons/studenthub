import { useRouteError } from "react-router-dom";

import { ErrorView } from "@/components/shared/error-view";

/** errorElement React Router, pengganti (app)/error.tsx. */
export default function RouteError() {
  const error = useRouteError();
  return (
    <ErrorView
      digest={error instanceof Error ? error.message : undefined}
      onRetry={() => window.location.reload()}
    />
  );
}
