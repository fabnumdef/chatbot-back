import { Check, Column, Entity, PrimaryColumn } from "typeorm";
import { Exclude } from "class-transformer";

@Entity('chatbot_config')
@Check(`id = 1`)
export class ChatbotConfig {
  @PrimaryColumn({type: 'int', default: () => `1`, nullable: false})
  @Exclude()
  id: number = 1;

  @Column({ nullable: false, length: 50 })
  name: string;

  @Column({ nullable: true, length: 50 })
  domain_name: string;

  @Column({ nullable: true, length: 50 })
  function: string;

  @Column({ nullable: false, length: 50 })
  icon: string;

  @Column({ nullable: false, length: 20 })
  primary_color: string;

  @Column({ nullable: false, length: 20 })
  secondary_color: string;

  @Column({ nullable: false, length: 200 })
  problematic: string;

  @Column({ nullable: false, length: 200 })
  audience: string;

  @Column({ nullable: false, default: 0, type: 'real' })
  media_size: number;

  @Column({ nullable: false, default: false })
  training_rasa: boolean;

  @Column({ nullable: false, default: false })
  need_training: boolean;

  @Column({ nullable: false, default: false })
  is_blocked: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  last_training_at: Date;

  @Column({ nullable: true, length: 50 })
  embedded_icon: string;

  @Column({ nullable: true, length: 255 })
  description: string;

  @Column({ nullable: true, length: 500 })
  help: string;

  @Column({ default: false })
  storage: boolean;

  @Column({ nullable: true, length: 255 })
  api_key: string;

  @Column({ default: false })
  maintenance_mode: boolean;

  @Column({ default: true })
  show_intent_search: boolean;

  @Column({ default: false })
  dismiss_quick_replies: boolean;

  @Column({ default: true })
  show_feedback: boolean;

  @Column({ default: false })
  block_type_text: boolean;

  @Column({ default: false })
  show_reboot_btn: boolean;
}
