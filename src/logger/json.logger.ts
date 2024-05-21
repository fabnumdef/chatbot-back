import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { inspect } from 'node:util';

let lastTimestampAt = Date.now();

export default class JsonLogger extends ConsoleLogger {
  error(message: string, error: unknown) {
    super.error(message, inspect(error, { depth: null } ));
  }

  protected static formatPid(pid: number) {
    return `${pid}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static colorize(message: string, _logLevel: LogLevel) {
    return message;
  }

  protected static getTimestamp() {
    return new Date().toISOString();
  }

  protected static updateAndGetTimestampDiff() {
    const now = Date.now();
    const diff = now - lastTimestampAt;

    lastTimestampAt = now;
    return String(diff);
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pid: string,
    _formattedLogLevel: string,
    _contextMessage: string,
    timestampDiff: string,
  ): string {
    const output = this.stringifyMessage(message, logLevel);

    return `${JSON.stringify({
      pid,
      timestamp: this.getTimestamp(),
      logLevel,
      context: this.context,
      message: output,
      timestampDiff: Number(timestampDiff),
    })}\n`;
  }
}
