import { createFileRoute } from "@tanstack/react-router";
import { RfqForm } from "@/components/rfq/RfqForm";

const TITLE = "Transformer Testing System – Requirement Form · Electrosoft Automation";
const DESCRIPTION =
  "Tell us your transformer testing needs and our engineering team will prepare a technical proposal and quotation.";

// The common link: on the website and shared on WhatsApp. Anyone can fill it, no sign-in.
export const Route = createFileRoute("/rfq/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => <RfqForm />,
});
