import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BOOKING_CONFIRMED } from "../../common/events/booking.events";
import type { BookingConfirmedEvent } from "../../common/events/booking.events";
import { LoyaltyService } from "./loyalty.service";

@Injectable()
export class LoyaltyListener {
  constructor(private readonly loyalty: LoyaltyService) {}

  @OnEvent(BOOKING_CONFIRMED)
  onBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
    return this.loyalty.accrueForConfirmedBooking(event.memberId);
  }
}
