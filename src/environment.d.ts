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
      DATABASE_SECURE?: 'true' | 'false';
      DATABASE_SSL_CERT?: string;

      RASA_API?: string;
      RASA_TOKEN?: string;
      RASA_CALLBACK_URL?: string;

      MAIL_HOST?: string;
      MAIL_PORT?: string;
      MAIL_USER?: string;
      MAIL_PASSWORD?: string;
      MAIL_SECURE?: 'true' | 'false';
      MAIL_FROM?: string;

      JWT_SECRET?: string;

      INTRADEF?: 'true' | 'false';

      HOST_URL?: string;

      DEBUG?: string;
      HOME?: string;
      PATH?: string;

      RATE_LIMIT?: string;

      FRONT_DIR?: string;
      WEBCHAT_DIR?: string;
      MEDIA_DIR?: string;

      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      BUCKET_NAME?: string;
      AWS_DEFAULT_REGION?: string;
      AWS_ENDPOINT_URL?: string;

      MODEL_HISTORY_SIZE?: string;

      /**
       * @default plain
       */
      LOG_FORMAT?: 'plain' | 'json'
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export { };

