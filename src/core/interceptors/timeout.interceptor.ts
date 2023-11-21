import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  /**
   * Augmentation du timeout par défaut sur la route /rasa/train qui peut prendre pas mal de temps
   * @param context
   * @param next
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const url = context.getArgByIndex(0).originalUrl;

    const timeoutMs = url.includes('/rasa/train') ? 3 * 60 * 1000 : 30 * 1000;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(err);
      }),
    );
  }
}
