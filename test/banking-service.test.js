import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import { BankingService } from "../src/services/banking.js";

describe("BankingService", () => {
  let service;

  beforeEach(() => {
    service = new BankingService();
  });

  describe("getBalance", () => {
    test("returns currency and available amount", () => {
      const balance = service.getBalance();
      assert.equal(balance.currency, "UAH");
      assert.equal(balance.available, 12450.75);
    });

    test("returns a plain object, not a reference to internal state", () => {
      const balance = service.getBalance();
      balance.available = 0;
      assert.equal(service.getBalance().available, 12450.75);
    });
  });

  describe("getTransactions", () => {
    test("returns the most recent transactions limited by parameter", () => {
      const tx = service.getTransactions(2);
      assert.equal(tx.length, 2);
      assert.equal(tx[0].description, "Grocery store");
      assert.equal(tx[1].description, "Salary");
    });

    test("defaults to 5 transactions when no limit provided", () => {
      const tx = service.getTransactions();
      assert.equal(tx.length, 3);
    });

    test("returns all transactions when limit exceeds count", () => {
      const tx = service.getTransactions(100);
      assert.equal(tx.length, 3);
    });
  });

  describe("getExchangeRate", () => {
    test("returns correct USD to UAH rate", () => {
      const rate = service.getExchangeRate("UAH", "USD");
      assert.equal(rate.from, "UAH");
      assert.equal(rate.to, "USD");
      assert.ok(Math.abs(rate.rate - 1 / 41.25) < 0.0001);
      assert.equal(rate.mock, true);
    });

    test("returns correct EUR to USD cross-rate", () => {
      const rate = service.getExchangeRate("EUR", "USD");
      assert.ok(Math.abs(rate.rate - 47.10 / 41.25) < 0.0001);
    });

    test("returns 1 for same currency conversion", () => {
      const rate = service.getExchangeRate("USD", "USD");
      assert.equal(rate.rate, 1);
    });
  });

  describe("executeTool", () => {
    test("routes to get_balance", () => {
      const result = service.executeTool("get_balance", {});
      assert.deepEqual(result, { currency: "UAH", available: 12450.75 });
    });

    test("routes to get_transactions with limit argument", () => {
      const result = service.executeTool("get_transactions", { limit: 1 });
      assert.equal(result.length, 1);
    });

    test("routes to get_exchange_rate with from/to arguments", () => {
      const result = service.executeTool("get_exchange_rate", { from: "USD", to: "EUR" });
      assert.equal(result.from, "USD");
      assert.equal(result.to, "EUR");
    });

    test("throws for unknown tool name", () => {
      assert.throws(
        () => service.executeTool("delete_account", {}),
        /Unknown tool/
      );
    });
  });

  describe("constructor", () => {
    test("clones account state to prevent mutation of default", () => {
      const service1 = new BankingService();
      const service2 = new BankingService({ currency: "USD", available: 999, transactions: [] });
      assert.equal(service1.getBalance().currency, "UAH");
      assert.equal(service2.getBalance().currency, "USD");
    });

    test("uses default account when no argument is provided", () => {
      assert.equal(service.getBalance().currency, "UAH");
      assert.equal(service.getBalance().available, 12450.75);
    });
  });
});
