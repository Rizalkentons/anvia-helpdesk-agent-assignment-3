import { Studio } from "@anvia/studio";
import { createHelpdeskAgent } from "./agent/index.js";
import { config } from "./config.js";

/**
 * Anvia Studio entry point: one agent, served with its tools and its Prisma
 * memory so every run can be inspected from the browser.
 */
const studio = new Studio([createHelpdeskAgent()], {
  quickPrompts: {
    helpdesk: [
      "My laptop keeps dropping the office VPN every few minutes. Please open a ticket for me.",
      "Which of my tickets are still open?",
      "What did I report last time, and what was the ticket id?",
    ],
  },
});

studio.start({ port: config.studio.port });
