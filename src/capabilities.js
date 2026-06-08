import { bankingTools } from "./tools/banking-tools.js";

export const capabilityCatalog = {
  tools: bankingTools.map((tool) => ({
    ...tool,
    category: "mock banking",
    status: "ready",
  })),
  skills: [
    {
      id: "document-analysis",
      name: "Document analysis",
      description:
        "Analyze a document or text and summarize the key points, risks, and next actions.",
      status: "ready",
      mode: "chat",
      preset: "document",
    },
    {
      id: "banking-assistant",
      name: "Banking assistant",
      description:
        "Use the mock banking tools to answer account and transaction questions.",
      status: "ready",
      mode: "banking",
      preset: "banking",
    },
  ],
};
