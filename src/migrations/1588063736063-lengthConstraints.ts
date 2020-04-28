import { MigrationInterface, QueryRunner } from "typeorm";

export class lengthConstraints1588063736063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "file_historic" ALTER COLUMN "name" TYPE varchar(50);`);
    await queryRunner.query(`ALTER TABLE "inbox" ALTER COLUMN "question" TYPE varchar(2000);`);
    await queryRunner.query(`ALTER TABLE "inbox" ALTER COLUMN "sender_id" TYPE varchar(255);`);
    await queryRunner.query(`ALTER TABLE "intent" ALTER COLUMN "category" TYPE varchar(255);`);
    await queryRunner.query(`ALTER TABLE "intent" ALTER COLUMN "main_question" TYPE varchar(255);`);
    await queryRunner.query(`ALTER TABLE "knowledge" ALTER COLUMN "question" TYPE varchar(255);`);
    await queryRunner.query(`ALTER TABLE "media" ALTER COLUMN "file" TYPE varchar(50);`);
    await queryRunner.query(`ALTER TABLE "response" ALTER COLUMN "response" TYPE varchar(2000);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "email" TYPE varchar(200);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "password" TYPE varchar(200);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "first_name" TYPE varchar(50);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "last_name" TYPE varchar(50);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "function" TYPE varchar(50);`);
    await queryRunner.query(`ALTER TABLE "chatbot_user" ALTER COLUMN "reset_password_token" TYPE varchar(255);`);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
  }
}
