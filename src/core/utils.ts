import { ExecOptions } from "child_process";

/**
 * Executes a shell command and return it as a Promise.
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
    maxBuffer: 1024*1024*1024
  };
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
    exec(cmd, execOptions, (error, stdout, stderr) => {
      resolve(stdout? stdout : stderr);
    });
  });
}
