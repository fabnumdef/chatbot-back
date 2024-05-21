import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export default class RasaGuard implements CanActivate {
  private rasaToken = process.env.RASA_TOKEN;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    return request?.query?.token && request.query.token === this.rasaToken;
  }
}
