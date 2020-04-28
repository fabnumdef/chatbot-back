import { Controller, Get } from '@nestjs/common';
import { DNSHealthIndicator, HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dns: DNSHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Server health' })
  check() {
    return this.health.check([
      () => this.dns.pingCheck('backoffice', 'http://127.0.0.1'),
      () => this.dns.pingCheck('rasa', 'http://127.0.0.1:5005'),
    ]);
  }
}
