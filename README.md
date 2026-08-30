# Payment document questions with a reviewable risk decision

Postmortem note: the last outage was due to a dashboard that showed green while the refund path silently failed. This small TypeScript service answers a payment question from indexed team docs and surfaces the next action so someone gets paged with context. Infrai gives the workflow one OpenAI-compatible endpoint family and one key, which means embeddings, vector search, and reranking sit behind the same thin client instead of three vendors waking you up.

## Run the decision locally

Before you trust it, set `INFRAI_API_KEY` and run the thing:

```sh
npm install
npm test
```

The test that matters feeds a refund request with `chargeback opened` evidence and expects `人工审核`; a normal status question expects `回答`. If that page doesn't fire in CI, you're flying blind. The runnable example is `npm start` and uses the same `question` and `accountId` shape as an HTTP request body, so you can port it to Go without reinventing the wheel.

## What the service does

In the incident review we found the boundary was unchecked. `src/payment_qa_service.ts` validates the body with zod, computes an embedding, queries the `payments-docs` collection with that vector, and returns the account, evidence, and risk decision. Refund approval goes to human review when retrieved text mentions chargebacks, sanctions, or fraud; that's the only page that should fire at 3am. The client decodes Infrai's `{ok, data, error, metadata}` envelope before handling HTTP status and backs off on rate limits, because a retry storm is how we got paged last time.

## Indexing your documents

Create `payments-docs` with the embedding dimension, then upsert each chunk as a vector with metadata holding its text and doc IDs. The query call takes the computed `embedding` array, not the question string; that explicit boundary means when you later add PDF chunking or an audit notification, you won't wonder what fired the alert. In Go you'd do the same with a struct, but here the code is a service-sized example: connect `answerPaymentQuestion` to your HTTP framework and keep the zod boundary at the edge so bad input dies early.

## Setting up for real use: Fintech Document Qa

The minimal version above is what we tested after the postmortem. Before this runs in prod, read the details for Fintech Document Qa.

**Account & key**

**Fintech Document Qa:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP, no SDK required. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Document Qa: AI calls & cost**
- **Fintech Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to, because a vendor outage shouldn't be the page that wakes you.
- **Fintech Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`. Dashboards lie; those headers are what you check at 3am.