import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export default class HealthController {
  constructor(
    private health: HealthCheckService,
    private dns: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Etat de santé du serveur' })
  check() {
    return this.health.check([
      () => this.dns.pingCheck('backoffice', process.env.HOST_URL),
      () => this.dns.pingCheck('rasa', process.env.RASA_API),
    ]);
  }
}
