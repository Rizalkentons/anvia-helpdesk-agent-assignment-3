import { createHelpdeskAgent } from "./agent/index.js";
import { memoryStore } from "./agent/memory.js";
import { config } from "./config.js";

/**
 * Headless demo: three turns against one remembered session, then a look at what
 * the memory store persisted.
 *
 *   pnpm demo
 *   MEMORY_COMPACTION_AFTER_TOKENS=300 MEMORY_COMPACTION_RECENT_TOKENS=50 pnpm demo
 */
const agent = createHelpdeskAgent();
const session = { sessionId: "demo-thread", userId: config.helpdesk.requesterId };

const prompts = [
  "Hi, I am Rizal from the finance team. Since this morning my laptop drops the office VPN every few minutes.",
  "Yes, please open a ticket. This blocks my month-end work, so mark it high priority.",
  "What is the status of the ticket you just opened for me?",
];

for (const prompt of prompts) {
  const outcome = await agent.generate({ prompt, session });

  if (outcome.type !== "response") {
    console.error(`Run did not produce a response: ${outcome.type}`);
    process.exitCode = 1;
    break;
  }

  console.log(`\n> ${prompt}\n${outcome.output}`);

  if (outcome.memoryCompaction) {
    const { originalMessageCount, retainedMessageCount, resultTokenCount, attempts } =
      outcome.memoryCompaction;
    console.log(
      `[automatic compaction] ${originalMessageCount} messages -> kept ${retainedMessageCount}, ` +
        `${resultTokenCount} tokens, attempts=${attempts}`,
    );
  }
}

const conversations = await memoryStore.inspector?.listConversations({
  limit: 5,
  userId: config.helpdesk.requesterId,
});
console.log("\n[stored conversations]", conversations);

const compaction = await agent.compactMemory({ session });
console.log("[manual compaction]", compaction);
