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
    // Paste as plain text so copied fonts, sizes and colours don't come along;
    // the pasted words take the styling of the spot they land in.
    onPaste: editable ? pastePlainText : undefined,
    className: editable ? "outline-none ring-2 ring-blue-400/40 rounded-sm" : undefined,
  } as const;

  if (overrideHtml != null) {
    return <div {...common} dangerouslySetInnerHTML={{ __html: overrideHtml }} />;
  }
  return <div {...common}>{children}</div>;
}

function pastePlainText(e: React.ClipboardEvent<HTMLDivElement>) {
  const text = e.clipboardData.getData("text/plain");
  e.preventDefault();
  if (!text) return;
  // insertText keeps the browser's undo (Ctrl+Z) working, unlike editing the DOM by hand.
  if (!document.execCommand("insertText", false, text)) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
}
