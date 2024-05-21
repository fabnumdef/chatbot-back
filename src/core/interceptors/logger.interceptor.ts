import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import BotLogger from '../../logger/bot.logger';

function getResponseTime(requestAt, responseAt, digits) { 
  if (!requestAt || !responseAt) {
    // missing request and/or response start time
    return 'n/a'
  }

  // calculate diff
  const ms = (responseAt[0] - requestAt[0]) * 1e3 +
    (responseAt[1] - requestAt[1]) * 1e-6

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits)
}

@Injectable()
export default class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new BotLogger('LoggerInterceptor');

  /**
   * Log de toutes les requêtes de l'application ainsi que la réponse correspondante
   * @param context
   * @param next
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const id = randomBytes(8).toString('hex');
    const ctx = context.switchToHttp();
    const req = ctx.getRequest()
    const res = ctx.getResponse()

    const body = Buffer.isBuffer(req.body) ? null : { ...req.body };
    if (body?.password) {
      body.password = 'PASSWORD';
    }
    this.logger.log(
      `REQUEST - ${id} - ${req.ip} - ${req.user?.email ?? 'Anonymous'} - ${req.method} - ${
        req.originalUrl
      } - ${!body ? '' : JSON.stringify(body)}`,
    );

    const requestAt = process.hrtime()

    return next.handle().pipe(
      tap(() => {
        const responseAt = process.hrtime()

        this.logger.log(`RESPONSE - ${id} - ${res.statusCode} - ${getResponseTime(requestAt, responseAt, 3)}ms`);
      }),
    );
  }
}
