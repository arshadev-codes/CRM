import type { ReactNode } from "react";

/**
 * Wraps one proposal section in the rendered document.
 *
 * - Normal mode: renders the real, data-driven React section.
 * - Override mode: the user edited this section in the preview editor, so we
 *   render the saved HTML snapshot instead (keeps their wording verbatim).
 * - Editable mode: the wrapper becomes contentEditable; on blur we hand the
 *   current innerHTML back so it can be stored as the override.
 */
export function SectionShell({
  id,
  overrideHtml,
  editable = false,
  onCommit,
  children,
}: {
  id: string;
  overrideHtml?: string;
  editable?: boolean;
  onCommit?: (html: string) => void;
  children?: ReactNode;
}) {
  const common = {
    "data-pdf-section": id,
    contentEditable: editable || undefined,
    suppressContentEditableWarning: true,
    onBlur: editable
      ? (e: React.FocusEvent<HTMLDivElement>) => onCommit?.(e.currentTarget.innerHTML)
      : undefined,
    className: editable ? "outline-none ring-2 ring-blue-400/40 rounded-sm" : undefined,
  } as const;

  if (overrideHtml != null) {
    return <div {...common} dangerouslySetInnerHTML={{ __html: overrideHtml }} />;
  }
  return <div {...common}>{children}</div>;
}
