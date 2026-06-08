import { bankingTools } from "./banking-agent.js";

export const capabilityCatalog = {
  tools: bankingTools.map((tool) => ({
    ...tool,
    category: "mock banking",
    status: "ready"
  })),
  skills: [
    {
      id: "document-analysis",
      name: "Document analysis",
      description: "A future reusable workflow combining prompts, validation, and tools.",
      status: "planned"
    },
    {
      id: "banking-assistant",
      name: "Banking assistant",
      description: "A future reusable agent configuration built on the banking tools.",
      status: "planned"
    }
  ]
};
