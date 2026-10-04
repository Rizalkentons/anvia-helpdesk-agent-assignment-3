import { Studio, createSqliteSessionStore } from "@anvia/studio";
import { createHelpdeskAgent } from "./agent/index.js";
import { config } from "./config.js";

/**
 * Anvia Studio entry point: one agent, served with its tools and its Prisma
 * memory so every run can be inspected from the browser.
 *
 * Studio keeps its own session transcript and trace store. The default is
 * in-process memory, which loses Studio sessions on restart, so this uses a
 * SQLite file next to the ticket data. Agent memory stays in PostgreSQL — the
 * two stores are independent, and the Memory page reads the Prisma one.
 */
const studioStore = createSqliteSessionStore({ path: config.studio.sessionStorePath });

const studio = new Studio([createHelpdeskAgent()], {
  stores: {
    sessions: studioStore,
    traces: studioStore,
  },
  quickPrompts: {
    helpdesk: [
      "My laptop keeps dropping the office VPN every few minutes. Please open a ticket for me.",
      "Which of my tickets are still open?",
      "What did I report last time, and what was the ticket id?",
    ],
  },
});

studio.start({ port: config.studio.port });
