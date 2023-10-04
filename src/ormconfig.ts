import { type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { type TlsOptions } from 'tls';

let sslConfig: boolean | TlsOptions = undefined;

if (process.env.INTRADEF !== 'true') {
  sslConfig = {
    rejectUnauthorized: false,
  };
}

if (process.env.DATABASE_SSL_CERT) {
  sslConfig = {
    ca: process.env.DATABASE_SSL_CERT,
  };
}

// If the DATABASE_SECURE is set to false, force disable SSL
if (process.env.DATABASE_SECURE === 'false') {
  sslConfig = false;
} else if (!sslConfig)
  // Else keep the config that could have been set prior to this. And only if the sslConfig is not yes configured, enable it.
  sslConfig = true;

const config: TypeOrmModuleOptions = {
  type: 'postgres',
  url: `postgres://${process.env.DATABASE_USER}:${
    process.env.DATABASE_PASSWORD
  }@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${
    process.env.DATABASE_NAME
  }?${process.env.DATABASE_SSL_CERT ? 'sslmode=require' : ''}`,
  entities: [`${__dirname}/core/entities/**/*.entity{.ts,.js}`],
  synchronize: true,
  // synchronize: !(process.env.NODE_ENV === 'prod'),

  // Allow both start:prod and start:dev to use migrations
  // __dirname is either dist or src folder, meaning either
  // the compiled js in prod or the ts in dev.
  migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],

  // Run migrations automatically,
  // you can disable this if you prefer running migration manually.
  migrationsRun: true,

  ssl: sslConfig,

  logging: process.env.DEBUG ? true : undefined,
};

export = config;
