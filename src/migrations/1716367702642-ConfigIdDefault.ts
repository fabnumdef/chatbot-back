import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigIdDefault1716367702642 implements MigrationInterface {
    name = 'ConfigIdDefault1716367702642'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chatbot_config" ALTER COLUMN "id" SET DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chatbot_config" ALTER COLUMN "id" SET DEFAULT '1'`);
    }

}
