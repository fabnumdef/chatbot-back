import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { User } from "@core/entities/user.entity";
import { FeedbackStatus } from "@core/enums/feedback-status.enum";

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({length: 2000})
  user_question: string;

  @Column({length: 2000})
  bot_response: string;

  @Column({type: 'double precision'})
  timestamp: number;

  @Column()
  status: FeedbackStatus;

  @CreateDateColumn({type: 'timestamp'})
  created_at: number;
}
