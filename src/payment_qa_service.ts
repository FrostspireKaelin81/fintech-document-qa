import { z } from "zod";
import { infrai } from "./infrai_client.js";

export const questionSchema = z.object({question: z.string().min(1), accountId: z.string().min(1), action: z.enum(["answer", "approve_refund"]).default("answer")});
export type Question = z.infer<typeof questionSchema>;

export function decideRisk(question: Question, evidence: string[]): "回答" | "人工审核" {
  if (question.action === "approve_refund" && evidence.some((item) => /chargeback|sanction|fraud/i.test(item))) return "人工审核";
  return "回答";
}

export async function answerPaymentQuestion(raw: unknown) {
  const input = questionSchema.parse(raw);
  const embedding = (await infrai["embeddings"](input.question)).data[0].embedding;
  const found = await infrai.query("payments-docs", embedding, 5);
  const evidence = (found.matches ?? []).map((m) => m.metadata?.text ?? m.id);
  const decision = decideRisk(input, evidence);
  return {accountId: input.accountId, decision, evidence};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = {question: "Which payment was reversed?", accountId: "acct_demo", action: "answer"};
  answerPaymentQuestion(body).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
