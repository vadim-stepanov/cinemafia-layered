import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { HealthService, HealthStatus } from "./health.service";

@ApiTags("health")
@Public()
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: "Liveness and database connectivity probe." })
  check(): Promise<HealthStatus> {
    return this.health.check();
  }
}
