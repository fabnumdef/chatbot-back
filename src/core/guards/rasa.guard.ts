import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Request } from 'express';

@Injectable()
export default class RasaGuard implements CanActivate {
  private rasaToken = process.env.RASA_TOKEN;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    return request?.query?.token && request.query.token === this.rasaToken;
  }
}
