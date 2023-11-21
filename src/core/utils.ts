import { ExecOptions } from 'child_process';
import { parse } from 'dotenv';

/**
 * Execution d'une commande shell et retour de celle-ci comme une Promise
 * @param cmd {string}
 * @param curDir {string}
 * @return {Promise<string>}
 */
export function execShellCommand(cmd, curDir?: string) {
  const execOptions: ExecOptions = {
    cwd: curDir,
    env: {
      DEBUG: '',
      HOME: process.env.HOME,
      PATH: process.env.PATH,
    },
    maxBuffer: 1024 * 1024 * 1024,
  };
  const { exec } = require('child_process');
  return new Promise((resolve, reject) => {
    exec(cmd, execOptions, (error, stdout, stderr) => {
      resolve(stdout || stderr);
    });
  });
}

export function jsonToDotenv(json: any): string {
  let dotenv = '';
  for (const property in json) {
    dotenv += `${property}=${json[property]}\n`;
  }
  return dotenv;
}

export function dotenvToJson(dotenv: string): any {
  return parse(dotenv);
}

export function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return `${str.slice(0, num)}...`;
}
