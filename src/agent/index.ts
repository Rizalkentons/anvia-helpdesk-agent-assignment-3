import { Agent, type AnyTool } from "@anvia/core";
import { createLoggerObserver } from "@anvia/logger";
import { config } from "../config.js";
import { createTicketService } from "../helpdesk/service.js";
import { createTicketTools } from "../helpdesk/tools.js";
import { HELPDESK_INSTRUCTIONS } from "./instructions.js";
import { logger } from "./logger.js";
import { createCompactionPolicy, memoryStore } from "./memory.js";
import { getModel } from "./model.js";

interface AgentOptions {
  modelId?: string;
  tools?: AnyTool[];
}

/**
 * Composition root for the helpdesk agent.
 *
 * Builds the domain service, adapts it into tools, and hands everything to the
 * Anvia runtime together with durable Prisma memory and automatic compaction.
 * Studio and the CLI demo both call this, so there is one wiring to reason about.
 */
export function createHelpdeskAgent(options: AgentOptions = {}) {
  const service = createTicketService({ path: config.helpdesk.ticketsFile });
  const tools =
    options.tools ??
    createTicketTools({ service, requesterId: config.helpdesk.requesterId });

  return new Agent({
    id: "helpdesk",
    name: "Helpdesk Agent",
    description: "Triages internal IT problems, opens tickets, and remembers the conversation.",
    model: getModel(options.modelId ?? config.model.id),
    instructions: HELPDESK_INSTRUCTIONS,
    maxTurns: 6,
    tools,
    memory: {
      store: memoryStore,
      savePolicy: "turn",
      compaction: createCompactionPolicy(),
    },
    observability: {
      observers: { logger: createLoggerObserver({ logger }) },
    },
  });
}
