import { createTool, type AnyTool } from "@anvia/core";
import { z } from "zod";
import type { TicketService } from "./service.js";

const prioritySchema = z.enum(["low", "medium", "high"]);
const statusSchema = z.enum(["open", "in_progress", "resolved"]);

const ticketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: prioritySchema,
  status: statusSchema,
  requesterId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

interface TicketToolDeps {
  service: TicketService;
  /** Authenticated requester, captured by the application — never supplied by the model. */
  requesterId: string;
}

/**
 * Three related helpdesk tools sharing one application-owned service:
 * `create_ticket` (side effect), `get_ticket` (lookup by id), `list_tickets` (search).
 */
export function createTicketTools(deps: TicketToolDeps): AnyTool[] {
  const createTicket = createTool({
    name: "create_ticket",
    description:
      "Create a helpdesk ticket for the current user. Use this whenever the user reports a problem that needs tracking.",
    inputSchema: z.object({
      title: z.string().min(3).describe("Short summary of the problem, e.g. 'VPN disconnects every 5 minutes'."),
      description: z
        .string()
        .min(3)
        .describe("What the user observed: symptoms, error messages, when it started."),
      priority: prioritySchema
        .optional()
        .describe("Impact level. Omit unless the user states urgency; defaults to medium."),
    }),
    outputSchema: z.object({ ticket: ticketSchema }),
    execute: async ({ title, description, priority }) => {
      const ticket = await deps.service.create({
        title,
        description,
        priority,
        requesterId: deps.requesterId,
      });

      return { ticket };
    },
  });

  const getTicket = createTool({
    name: "get_ticket",
    description:
      "Look up one ticket by its id (for example TCK-1001) to read its current status, priority, and description.",
    inputSchema: z.object({
      ticketId: z.string().min(1).describe("Ticket id such as TCK-1001."),
    }),
    outputSchema: z.object({
      ticket: ticketSchema.nullable().describe("The ticket, or null when no ticket has that id."),
    }),
    execute: async ({ ticketId }) => {
      const ticket = await deps.service.get(ticketId);
      return { ticket: ticket ?? null };
    },
  });

  const listTickets = createTool({
    name: "list_tickets",
    description:
      "List helpdesk tickets, newest first. Defaults to the current user's tickets; filter by status when the user asks about open or resolved work.",
    inputSchema: z.object({
      status: statusSchema.optional().describe("Only return tickets in this status."),
      allUsers: z
        .boolean()
        .optional()
        .describe("Set true only when the user explicitly asks for tickets from every user."),
    }),
    outputSchema: z.object({
      tickets: z.array(ticketSchema),
      count: z.number(),
    }),
    execute: async ({ status, allUsers }) => {
      const tickets = await deps.service.list({
        status,
        ...(allUsers === true ? {} : { requesterId: deps.requesterId }),
      });

      return { tickets, count: tickets.length };
    },
  });

  return [createTicket, getTicket, listTickets];
}
