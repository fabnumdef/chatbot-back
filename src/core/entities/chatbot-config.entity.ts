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
}
