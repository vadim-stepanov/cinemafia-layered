import { Global, Module } from "@nestjs/common";
import { NotificationsListener } from "./notifications.listener";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
