import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 2000 })
  user_question: string;

  @Column({ length: 255 })
  sender_id: string;

  @Column({ length: 2000 })
  bot_response: string;

  @Column({ type: 'double precision' })
  timestamp: number;

  @Column()
  status: FeedbackStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: number;
}
