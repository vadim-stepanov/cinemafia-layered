import { Module } from "@nestjs/common";
import { LoyaltyListener } from "./loyalty.listener";
import { LoyaltyRepository } from "./loyalty.repository";
import { LoyaltyService } from "./loyalty.service";

@Module({
  providers: [LoyaltyService, LoyaltyRepository, LoyaltyListener],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
