import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  requesterId: string;
  priority?: TicketPriority | undefined;
};

export type ListTicketsQuery = {
  requesterId?: string | undefined;
  status?: TicketStatus | undefined;
};

/**
 * Application-owned helpdesk domain. Tools depend on this interface, never on
 * a concrete storage implementation.
 */
export interface TicketService {
  create(input: CreateTicketInput): Promise<Ticket>;
  get(ticketId: string): Promise<Ticket | undefined>;
  list(query?: ListTicketsQuery): Promise<Ticket[]>;
}

const ID_PREFIX = "TCK-";
const FIRST_TICKET_NUMBER = 1001;

/**
 * JSON-file backed implementation so the demo survives restarts without a
 * second database. Read-modify-write cycles are serialized because the agent
 * runtime may execute several tool calls from one turn concurrently.
 */
export function createTicketService(options: { path: string }): TicketService {
  const { path } = options;
  let cache: Ticket[] | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function load(): Promise<Ticket[]> {
    if (cache) return cache;

    try {
      const raw = await readFile(path, "utf8");
      cache = JSON.parse(raw) as Ticket[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      cache = [];
    }

    return cache;
  }

  async function persist(next: Ticket[]): Promise<void> {
    cache = next;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  function nextId(tickets: readonly Ticket[]): string {
    const highest = tickets.reduce((max, ticket) => {
      const value = Number.parseInt(ticket.id.slice(ID_PREFIX.length), 10);
      return Number.isNaN(value) ? max : Math.max(max, value);
    }, FIRST_TICKET_NUMBER - 1);

    return `${ID_PREFIX}${highest + 1}`;
  }

  return {
    create(input) {
      return serialize(async () => {
        const tickets = await load();
        const now = new Date().toISOString();
        const ticket: Ticket = {
          id: nextId(tickets),
          title: input.title,
          description: input.description,
          priority: input.priority ?? "medium",
          status: "open",
          requesterId: input.requesterId,
          createdAt: now,
          updatedAt: now,
        };

        await persist([...tickets, ticket]);
        return ticket;
      });
    },

    async get(ticketId) {
      const tickets = await load();
      const normalized = ticketId.trim().toUpperCase();
      return tickets.find((ticket) => ticket.id.toUpperCase() === normalized);
    },

    async list(query = {}) {
      const tickets = await load();
      return tickets
        .filter((ticket) => (query.requesterId ? ticket.requesterId === query.requesterId : true))
        .filter((ticket) => (query.status ? ticket.status === query.status : true))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
  };
}
