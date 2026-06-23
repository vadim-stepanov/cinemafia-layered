import { Injectable, Logger } from "@nestjs/common";

export interface Notification {
  userId: string;
  subject: string;
  body: string;
}

/**
 * Demo-boundary: emulated notification channel. Logs the "delivery" instead of
 * sending anything. Swappable for a real email/push adapter.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  send(notification: Notification): void {
    this.logger.log(`Notify ${notification.userId}: ${notification.subject}`);
  }
}
