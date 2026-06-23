import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BOOKING_CONFIRMED } from "../events/booking.events";
import type { BookingConfirmedEvent } from "../events/booking.events";
import { SUPPORT_TICKET_CREATED } from "../events/support.events";
import type { SupportTicketCreatedEvent } from "../events/support.events";
import { NotificationsService } from "./notifications.service";

@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(BOOKING_CONFIRMED)
  onBookingConfirmed(event: BookingConfirmedEvent): void {
    this.notifications.send({
      userId: event.memberId,
      subject: "Booking confirmed",
      body: `Your booking ${event.bookingId} is confirmed.`,
    });
  }

  @OnEvent(SUPPORT_TICKET_CREATED)
  onSupportTicketCreated(event: SupportTicketCreatedEvent): void {
    this.notifications.send({
      userId: event.userId,
      subject: "We received your support request",
      body: `Ticket ${event.ticketId}: ${event.subject}`,
    });
  }
}
