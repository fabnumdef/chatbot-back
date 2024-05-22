import { MigrationInterface, QueryRunner } from "typeorm";

export class Index1716308508040 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS faq_events_type_name_idx ON "faq_events" ("type_name");
            CREATE INDEX IF NOT EXISTS faq_events_timestamp_idx ON "faq_events" ("timestamp");
            CREATE INDEX IF NOT EXISTS faq_events_intent_name_idx ON "faq_events" ("intent_name");
            CREATE INDEX IF NOT EXISTS faq_events_category_name_idx ON "faq_events" ("category_name");

            CREATE INDEX IF NOT EXISTS inbox_confidence_idx ON "inbox" ("confidence");
            CREATE INDEX IF NOT EXISTS inbox_question_idx ON "inbox" ("question");
            CREATE INDEX IF NOT EXISTS inbox_response_idx ON "inbox" ("response");
            CREATE INDEX IF NOT EXISTS inbox_timestamp_idx ON "inbox" ("timestamp");
            CREATE INDEX IF NOT EXISTS inbox_status_idx ON "inbox" ("status");
            CREATE INDEX IF NOT EXISTS inbox_feedback_status_idx ON "inbox" ("feedback_status");
            CREATE INDEX IF NOT EXISTS inbox_userEmail_idx ON "inbox" ("userEmail");
            CREATE INDEX IF NOT EXISTS inbox_created_at_idx ON "inbox" ("created_at");
            CREATE INDEX IF NOT EXISTS inbox_feedback_timestamp_idx ON "inbox" ("feedback_timestamp");

            CREATE INDEX IF NOT EXISTS inbox_category_idx ON "intent" ("category");
            CREATE INDEX IF NOT EXISTS inbox_status_idx ON "intent" ("status");
            CREATE INDEX IF NOT EXISTS inbox_hidden_idx ON "intent" ("hidden");
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS faq_events_type_name_idx;
            DROP INDEX IF EXISTS faq_events_timestamp_idx;
            DROP INDEX IF EXISTS faq_events_intent_name_idx;
            DROP INDEX IF EXISTS faq_events_category_name_idx;
    
            DROP INDEX IF EXISTS inbox_confidence_idx;
            DROP INDEX IF EXISTS inbox_question_idx;
            DROP INDEX IF EXISTS inbox_response_idx;
            DROP INDEX IF EXISTS inbox_timestamp_idx;
            DROP INDEX IF EXISTS inbox_status_idx;
            DROP INDEX IF EXISTS inbox_feedback_status_idx;
            DROP INDEX IF EXISTS inbox_userEmail_idx;
            DROP INDEX IF EXISTS inbox_created_at_idx;
            DROP INDEX IF EXISTS inbox_feedback_timestamp_idx;
    
            DROP INDEX IF EXISTS inbox_category_idx;
            DROP INDEX IF EXISTS inbox_status_idx;
            DROP INDEX IF EXISTS inbox_hidden_idx;
        `)
    }

}
