/**
 * Banking Tools Definitions
 * OpenAI-compatible tool definitions for mock banking operations
 */

export const bankingTools = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Get the current mock account balance and its currency.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "get_transactions",
      description: "Get the most recent mock account transactions.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Number of recent transactions to return."
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_exchange_rate",
      description: "Get a mock exchange rate between two supported currencies.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", enum: ["UAH", "USD", "EUR"] },
          to: { type: "string", enum: ["UAH", "USD", "EUR"] }
        },
        required: ["from", "to"],
        additionalProperties: false
      }
    }
  }
];
