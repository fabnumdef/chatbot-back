declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Warning:
      NODE_ENV?: 'local' | 'dev' | 'development' | 'production';

      DATABASE_HOST?: string;
      DATABASE_PORT?: string;
      DATABASE_NAME?: string;
      DATABASE_USER?: string;
      DATABASE_PASSWORD?: string;
      DATABASE_SECURE: 'true' | 'false';
      DATABASE_SSL_CERT?: string;

      RASA_DATABASE_NAME?: string;
      RASA_DATABASE_USER?: string;
      RASA_DATABASE_PASSWORD?: string;

      /**
       * Path to the rasa executable.
       * Only used in the default command values.
       *
       * If you use one of the bellow variable to override the default, you must specify the rasa executable path
       *
       * @example /usr/bin/python3.8 rasa
       */
      RASA_PATH?: string;
      /**
       * Override the command to execute when training model
       */
      RASA_CMD_TRAIN?: string;
      /**
       * Override the command to execute when finetuning model
       */
      RASA_CMD_FINETUNE?: string;
      /**
       * Override the command to execute in order to disable telemetry
       */
      RASA_CMD_DISABLE_TELEMETRY?: string;
      /**
       * Override the command to execute in order to restart the rasa service
       */
      RASA_CMD_RESTART?: string;

      MAIL_HOST?: string;
      MAIL_PORT?: string;
      MAIL_USER?: string;
      MAIL_PASSWORD?: string;
      MAIL_SECURE?: 'true' | 'false';
      MAIL_FROM?: string;

      JWT_SECRET?: string;

      INTRADEF?: 'true' | 'false';
      PYTHON_VERSION?: string;

      HOST_URL?: string;

      DEBUG?: string;
      HOME?: string;
      PATH?: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
