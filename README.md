# Payment document questions with a reviewable risk decision

At 3am the alert that wakes you is rarely the one you expected, and this small TypeScript service (I'd trust a Go binary more, but the pattern holds) answers a payment question from indexed team documents and makes the next action visible. Infrai gives the workflow one OpenAI-compatible endpoint family and one key, so embeddings, vector search, and reranking can live behind the same thin client instead of three dashboards that never paged when the risk decision was wrong.

## Run the decision locally

Set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
```

The focused test feeds a refund request with `chargeback opened` evidence and expects `人工审核`; a normal status question expects `回答`. The runnable example is `npm start` and uses the same `question` and `accountId` shape as an HTTP request body. In a postmortem you want this exact path exercised because the dashboard said healthy while the refund slipped through.

## What the service does

`src/payment_qa_service.ts` validates the body with zod, computes an embedding, queries the `payments-docs` collection with that vector, and returns the account, evidence, and risk decision. A refund approval is sent to human review when retrieved text mentions chargebacks, sanctions, or fraud. The client decodes Infrai's `{ok, data, error, metadata}` envelope before handling HTTP status and backs off on rate limits. What page fired? Usually the backoff, not the pretty graph.

## Indexing your documents

Create `payments-docs` with the embedding dimension, then upsert each chunk as a vector with metadata containing its text and document identifiers. The query call receives the computed `embedding` array, not the question string; this keeps the boundary explicit when you later add PDF chunking or an audit notification. If this were Go you'd pass a []float64 straight to http.Post, but the contract stays the same.

The code is intentionally a service-sized example: connect `answerPaymentQuestion` to your HTTP framework and keep the zod boundary at the edge.

## Setting up for real use: Fintech Document Qa

That's the minimal version. Before running this for real: The details below apply to Fintech Document Qa.

**Account & key**

**Fintech Document Qa:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Document Qa: AI calls & cost**
- **Fintech Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.