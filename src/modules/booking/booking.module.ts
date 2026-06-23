import { Module } from "@nestjs/common";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { BookingController } from "./booking.controller";
import { BookingExpiryService } from "./booking-expiry.service";
import { BookingRepository } from "./booking.repository";
import { BookingService } from "./booking.service";

@Module({
  imports: [EntitlementsModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository, BookingExpiryService],
})
export class BookingModule {}
