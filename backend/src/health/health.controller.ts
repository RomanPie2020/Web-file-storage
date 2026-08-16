import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return { status: 'ok', service: 'backend' };
  }

  @Public()
  @Get('dependencies')
  getDependencies() {
    return this.healthService.checkDependencies();
  }
}
