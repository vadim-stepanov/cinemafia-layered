/** In-process domain events (NestJS EventEmitter). Booker → loyalty + notifications. */
export const BOOKING_CONFIRMED = "booking.confirmed";

export interface BookingConfirmedEvent {
  bookingId: string;
  memberId: string;
  sessionId: string;
}
