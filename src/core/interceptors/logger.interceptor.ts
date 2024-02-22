import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import BotLogger from '../../logger/bot.logger';

const crypto = require('crypto');

@Injectable()
export default class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new BotLogger('LoggerInterceptor');

  /**
   * Log de toutes les requêtes de l'application ainsi que la réponse correspondante
   * @param context
   * @param next
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const id = crypto.randomBytes(8).toString('hex');
    const req = context.getArgByIndex(0);
    const body = Buffer.isBuffer(req.body) ? null : { ...req.body };
    if (body?.password) {
      body.password = 'PASSWORD';
    }
    this.logger.log(
      `REQUEST - ${id} - ${req.ip} - ${req.user?.email} - ${req.method} - ${
        req.originalUrl
      } - ${!body ? '' : JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`RESPONSE - ${id}`);
      }),
    );
  }
}
