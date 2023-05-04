import { TypeOrmModuleOptions } from '@nestjs/typeorm';

type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

const config: Writeable<TypeOrmModuleOptions> = {
  type: 'postgres',
  url: `postgres://${process.env.DATABASE_USER}:${
    process.env.DATABASE_PASSWORD
  }@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${
    process.env.DATABASE_NAME
  }?${process.env.DATABASE_SSL_CERT ? 'sslmode=require' : ''}`,
  entities: [__dirname + '/core/entities/**/*.entity{.ts,.js}'],
  synchronize: true,
  // synchronize: !(process.env.NODE_ENV === 'prod'),

  // Allow both start:prod and start:dev to use migrations
  // __dirname is either dist or src folder, meaning either
  // the compiled js in prod or the ts in dev.
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],

  // Run migrations automatically,
  // you can disable this if you prefer running migration manually.
  migrationsRun: true,

  ssl: process.env.DATABASE_SECURE
    ? process.env.DATABASE_SECURE === 'true'
    : undefined,
};

if (!process.env.INTRADEF || process.env.INTRADEF !== 'true') {
  config.ssl = {
    rejectUnauthorized: false,
  };
}

if (process.env.DATABASE_SSL_CERT) {
  config.ssl = {
    ca: process.env.DATABASE_SSL_CERT,
  };
}

export = config;
