import { useState, type ComponentProps, type MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A button for actions that take a moment (saving to the cloud, deleting):
 * while the click's promise runs it is disabled and shows a spinner, so the
 * user sees the click was taken and doesn't press it again.
 */
export function AsyncButton({
  onClick,
  pendingText,
  children,
  disabled,
  ...rest
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  onClick: (e: MouseEvent<HTMLButtonElement>) => unknown;
  /** Text shown while working, e.g. "Deleting…". Defaults to the normal label. */
  pendingText?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={async (e) => {
        if (pending) return;
        setPending(true);
        try {
          await onClick(e);
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {pendingText ? <span className="ml-1">{pendingText}</span> : children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
