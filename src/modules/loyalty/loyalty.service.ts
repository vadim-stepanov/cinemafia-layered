import { Injectable } from "@nestjs/common";
import { LoyaltyRepository } from "./loyalty.repository";

// Loyalty is an accumulating rank, not spendable currency:
// each confirmed booking earns one degree.
export const DEGREES_PER_CONFIRMED_BOOKING = 1;

@Injectable()
export class LoyaltyService {
  constructor(private readonly repo: LoyaltyRepository) {}

  accrueForConfirmedBooking(memberId: string): Promise<void> {
    return this.repo.incrementDegree(memberId, DEGREES_PER_CONFIRMED_BOOKING);
  }
}
