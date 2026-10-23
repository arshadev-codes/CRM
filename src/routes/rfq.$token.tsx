import { createFileRoute } from "@tanstack/react-router";
import { RfqForm } from "@/components/rfq/RfqForm";

const TITLE = "Transformer Testing System – Requirement Form · Electrosoft Automation";

// A personal link made for one client on the Enquiries page; their details come filled in.
export const Route = createFileRoute("/rfq/$token")({
  head: () => ({ meta: [{ title: TITLE }, { property: "og:title", content: TITLE }] }),
  component: PersonalForm,
});

function PersonalForm() {
  const { token } = Route.useParams();
  return <RfqForm key={token} token={token} />;
}
