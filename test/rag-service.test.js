import assert from "node:assert/strict";
import test, { describe, beforeEach, afterEach } from "node:test";
import { RagService } from "../src/services/rag-service.js";

describe("RagService", () => {
  let service;

  beforeEach(() => {
    service = new RagService();
  });

  afterEach(async () => {
    await service.initializePromise;
  });

  describe("addDocument", () => {
    test("indexes text and makes it searchable", async () => {
      service.addDocument("doc1.md", "The quick brown fox jumps over the lazy dog.");
      const results = service.searchIndex("brown fox", 5);
      assert.equal(results.length, 1);
      assert.match(results[0].content, /quick brown fox/);
    });

    test("splits long text into multiple chunks", async () => {
      const paragraph1 = "A".repeat(300);
      const paragraph2 = "B".repeat(300);
      const paragraph3 = "C".repeat(100);
      const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
      service.addDocument("doc2.md", text);
      const results = service.searchIndex("CCC", 5);
      assert.ok(results.length >= 1);
      assert.match(results[0].content, /C/);
    });
  });

  describe("search", () => {
    test("finds content by exact phrase after initialization", async () => {
      service.addDocument("fox-doc.md", "The quick brown fox jumps over the lazy dog.");
      await service.initializePromise;
      const results = await service.search("brown fox", 2);
      assert.equal(results.length, 1);
      assert.match(results[0].content, /quick brown fox/);
    });

    test("falls back to keyword search when exact phrase yields no results", async () => {
      service.addDocument("quantum-doc.md", "This is a paragraph about quantum computing and superposition.");
      await service.initializePromise;
      const results = await service.search("quantum computing", 2);
      assert.ok(results.length > 0);
      assert.match(results[0].content, /quantum/);
    });

    test("returns empty array for queries with no matching keywords", async () => {
      service.addDocument("simple.md", "Hello world.");
      await service.initializePromise;
      const results = await service.search("zzzzzzz", 5);
      assert.equal(results.length, 0);
    });

    test("respects the limit parameter", async () => {
      service.addDocument("alpha.md", "Alpha one. ");
      service.addDocument("alpha-two.md", "Alpha two. ");
      service.addDocument("alpha-three.md", "Alpha three. ");
      await service.initializePromise;
      const results = await service.search("alpha", 2);
      assert.ok(results.length <= 2);
    });
  });

  describe("extractKeywords", () => {
    test("removes stopwords and short tokens", () => {
      const keywords = service.extractKeywords("What is the weather in Kyiv");
      assert.deepEqual(keywords, ["weather", "kyiv"]);
    });

    test("removes punctuation", () => {
      const keywords = service.extractKeywords("hello, world! fetching data...");
      assert.deepEqual(keywords, ["hello", "world", "fetching", "data"]);
    });

    test("returns empty array for all-stopword input", () => {
      const keywords = service.extractKeywords("the is a an");
      assert.deepEqual(keywords, []);
    });
  });
});
