import { createPinoLogger } from "@anvia/logger";

export const logger = createPinoLogger({
  name: "helpdesk-agent",
  level: "info",
  pinoOptions: {
    transport: {
      target: "pino-pretty",
    },
  },
});
