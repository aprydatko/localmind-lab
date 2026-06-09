import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { bankingTools } from "../src/tools/banking-tools.js";

describe("bankingTools schema", () => {
  test("all tools have type 'function' property", () => {
    bankingTools.forEach((tool) => {
      assert.equal(tool.type, "function");
    });
  });

  test("all tools have required function.name property", () => {
    bankingTools.forEach((tool) => {
      assert.equal(typeof tool.function.name, "string");
      assert.ok(tool.function.name.length > 0);
    });
  });

  test("all tools have a non-empty description", () => {
    bankingTools.forEach((tool) => {
      assert.equal(typeof tool.function.description, "string");
      assert.ok(tool.function.description.length > 0);
    });
  });

  test("all tools have parameters as an object type", () => {
    bankingTools.forEach((tool) => {
      assert.equal(tool.function.parameters.type, "object");
    });
  });

  test("all tools disallow additional properties", () => {
    bankingTools.forEach((tool) => {
      assert.equal(tool.function.parameters.additionalProperties, false);
    });
  });

  test("get_balance has no required parameters and empty properties", () => {
    const tool = bankingTools.find((t) => t.function.name === "get_balance");
    assert.deepEqual(tool.function.parameters.properties, {});
    assert.equal(tool.function.parameters.required, undefined);
  });

  test("get_transactions has optional integer limit with min 1 max 10", () => {
    const tool = bankingTools.find((t) => t.function.name === "get_transactions");
    const params = tool.function.parameters.properties;
    const required = tool.function.parameters.required;

    assert.equal(params.limit.type, "integer");
    assert.equal(params.limit.minimum, 1);
    assert.equal(params.limit.maximum, 10);
    assert.equal(typeof params.limit.description, "string");

    assert.deepEqual(required, undefined);
  });

  test("get_exchange_rate has required from and to with enum values", () => {
    const tool = bankingTools.find((t) => t.function.name === "get_exchange_rate");
    const params = tool.function.parameters.properties;
    const required = tool.function.parameters.required;

    assert.deepEqual(params.from.enum, ["UAH", "USD", "EUR"]);
    assert.deepEqual(params.to.enum, ["UAH", "USD", "EUR"]);
    assert.deepEqual(required, ["from", "to"]);
  });

  test("tool names are unique", () => {
    const names = bankingTools.map((t) => t.function.name);
    const unique = new Set(names);
    assert.equal(unique.size, names.length);
  });

  test("exactly three tools are defined", () => {
    assert.equal(bankingTools.length, 3);
  });
});
