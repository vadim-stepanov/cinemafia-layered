import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "./common/config/config.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./common/auth/auth.module";
import { PaymentModule } from "./common/payment/payment.module";
import { NotificationsModule } from "./common/notifications/notifications.module";
import { HealthModule } from "./common/health/health.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { MembersModule } from "./modules/members/members.module";
import { BookingModule } from "./modules/booking/booking.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { ClubNotesModule } from "./modules/club-notes/club-notes.module";
import { SupportModule } from "./modules/support/support.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    PaymentModule,
    NotificationsModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HealthModule,
    CatalogModule,
    MembersModule,
    BookingModule,
    LoyaltyModule,
    ClubNotesModule,
    SupportModule,
  ],
})
export class AppModule {}
