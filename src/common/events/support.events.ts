/** In-process domain event: a support ticket was opened. */
export const SUPPORT_TICKET_CREATED = "support.ticket.created";

export interface SupportTicketCreatedEvent {
  ticketId: string;
  userId: string;
  subject: string;
}
