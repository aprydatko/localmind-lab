import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { capabilityCatalog } from "../src/capabilities.js";

describe("capabilityCatalog", () => {
  test("has tools and skills arrays", () => {
    assert.ok(Array.isArray(capabilityCatalog.tools));
    assert.ok(Array.isArray(capabilityCatalog.skills));
  });

  test("has exactly three tools", () => {
    assert.equal(capabilityCatalog.tools.length, 3);
  });

  test("all tools have category and status fields from enrichment", () => {
    capabilityCatalog.tools.forEach((tool) => {
      assert.equal(tool.category, "mock banking");
      assert.equal(tool.status, "ready");
    });
  });

  test("preserves original tool properties after enrichment", () => {
    const balance = capabilityCatalog.tools.find(
      (t) => t.function.name === "get_balance"
    );
    assert.ok(balance);
    assert.equal(balance.type, "function");
    assert.equal(balance.function.description, "Get the current mock account balance and its currency.");
  });

  test("has exactly two skills", () => {
    assert.equal(capabilityCatalog.skills.length, 2);
  });

  test("all skills have id, name, description, status, mode, and preset fields", () => {
    capabilityCatalog.skills.forEach((skill) => {
      assert.equal(typeof skill.id, "string");
      assert.equal(typeof skill.name, "string");
      assert.equal(typeof skill.description, "string");
      assert.equal(typeof skill.status, "string");
      assert.equal(typeof skill.mode, "string");
      assert.equal(typeof skill.preset, "string");
    });
  });

  test("skill ids are unique", () => {
    const ids = capabilityCatalog.skills.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("banking-assistant skill references banking tool mode", () => {
    const banking = capabilityCatalog.skills.find((s) => s.id === "banking-assistant");
    assert.equal(banking.mode, "banking");
  });

  test("document-analysis skill uses chat mode", () => {
    const doc = capabilityCatalog.skills.find((s) => s.id === "document-analysis");
    assert.equal(doc.mode, "chat");
  });
});
