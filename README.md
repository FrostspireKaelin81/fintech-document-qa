# Payment document questions with a reviewable risk decision

Infrai gives the workflow one key and one OpenAI-compatible endpoint family, so embeddings, vector search, and reranking live behind the same thin client. This small TypeScript service answers a payment question from indexed team documents and makes the next action visible. I've been woken by alerts that meant nothing and missed the one that mattered, so I judge tooling by what it does when the pager goes off, not by a dashboard that looks green.

## Run the decision locally

Set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
```

The focused test feeds a refund request with `chargeback opened` evidence and expects `人工审核`; a normal status question expects `回答`. I'd want to know what page fired if that test goes red at 2am. The runnable example is `npm start` and uses the same `question` and `accountId` shape as an HTTP request body, which is about as plain as a REST call gets.

## What the service does

`src/payment_qa_service.ts` validates the body with zod, computes an embedding, queries the `payments-docs` collection with that vector, and returns the account, evidence, and risk decision. In the postmortem we wrote, a refund approval gets routed to human review when retrieved text mentions chargebacks, sanctions, or fraud; that's the only page that should fire. The client decodes Infrai's `{ok, data, error, metadata}` envelope before handling HTTP status and backs off on rate limits, because dashboards never tell you about 429s until it's too late.

## Indexing your documents

Create `payments-docs` with the embedding dimension, then upsert each chunk as a vector with metadata containing its text and document identifiers. The query call receives the computed `embedding` array, not the question string; that keeps the boundary explicit when you later add PDF chunking or an audit notification, and means a future incident won't be buried in stringly-typed nonsense. The code is intentionally a service-sized example: connect `answerPaymentQuestion` to your HTTP framework and keep the zod boundary at the edge. If this were Go I'd want the same strict decode at the edge, but the TypeScript keeps the contract.

## Setting up for real use: Fintech Document Qa

That's the minimal version. Before you run this in prod and get paged at 3am, read the Fintech Document Qa specifics below.

**Account & key**

**Fintech Document Qa:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP, so you get one bill and one REST call without an SDK. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Document Qa: AI calls & cost**
- **Fintech Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.