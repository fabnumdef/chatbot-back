import { ConsoleLogger, LogLevel } from '@nestjs/common';

let lastTimestampAt = Date.now();

export default class BotLogger extends ConsoleLogger {
  error(message: string, error: unknown) {
    let trace: string | undefined;

    if (error instanceof Error) {
      trace = `${error.name}: ${error.message}\n${error.stack}`;
    } else if (
      typeof error === 'string' ||
      typeof error === 'boolean' ||
      typeof error === 'number'
    ) {
      trace = String(error);
    } else {
      try {
        trace = JSON.stringify(error);
      } catch {
        trace = undefined;
      }
    }

    super.error(message, trace);
  }

  // protected static formatPid(pid: number) {
  //   return `${pid}`;
  // }

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // protected static colorize(message: string, _logLevel: LogLevel) {
  //   return message;
  // }

  // protected static getTimestamp() {
  //   return new Date().toISOString();
  // }

  // protected static updateAndGetTimestampDiff() {
  //   const now = Date.now();
  //   const diff = now - lastTimestampAt;

  //   lastTimestampAt = now;
  //   return String(diff);
  // }

  // protected formatMessage(
  //   logLevel: LogLevel,
  //   message: unknown,
  //   pid: string,
  //   _formattedLogLevel: string,
  //   _contextMessage: string,
  //   timestampDiff: string,
  // ): string {
  //   const output = this.stringifyMessage(message, logLevel);

  //   return `${JSON.stringify({
  //     pid,
  //     timestamp: this.getTimestamp(),
  //     logLevel,
  //     context: this.context,
  //     message: output,
  //     timestampDiff: Number(timestampDiff),
  //   })}\n`;
  // }
}
