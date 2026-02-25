import * as React from "react";

import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700",
        className
      )}
      {...props}
    />
  );
}

export { Alert };
