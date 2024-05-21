import { ConsoleLogger } from '@nestjs/common';
import { inspect } from 'node:util';
import JsonLogger from './json.logger';

class PlainLogger extends ConsoleLogger {
  error(message: string, error: unknown) {
    super.error(message, inspect(error, { depth: null }));
  }
}

export function getLogger(): typeof ConsoleLogger {
  switch (process.env.LOG_FORMAT) {
    case 'json':
      return JsonLogger;

    case 'plain':
    case undefined:
      return PlainLogger;

    default:
      // TODO: Log that the logger is unknown and fallback to PlainLogger
      return PlainLogger;
  }
}

const BotLogger = getLogger()


export default BotLogger;