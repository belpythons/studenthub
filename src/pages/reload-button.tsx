import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReloadButton() {
  return (
    <Button onClick={() => window.location.reload()}>
      <RefreshCw aria-hidden />
      Coba lagi
    </Button>
  );
}
