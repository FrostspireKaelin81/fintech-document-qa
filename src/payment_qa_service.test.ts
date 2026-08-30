import assert from "node:assert/strict";
import { decideRisk } from "./payment_qa_service.js";

assert.equal(decideRisk({question: "refund", accountId: "acct_1", action: "approve_refund"}, ["chargeback opened"]), "人工审核");
assert.equal(decideRisk({question: "status", accountId: "acct_1", action: "answer"}, ["settled payment"]), "回答");
console.log("risk decisions passed");
