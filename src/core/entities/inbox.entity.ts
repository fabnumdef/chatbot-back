import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Intent } from '@core/entities/intent.entity';
import { InboxStatus } from '@core/enums/inbox-status.enum';
import { User } from '@core/entities/user.entity';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';

@Entity('inbox')
export class Inbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event_id: number;

  @Column({ type: 'double precision' })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  intent_ranking: any;

  @Column({ length: 2000 })
  question: string;

  @Column({ type: 'text' })
  response: any;

  @Column({ length: 255 })
  sender_id: string;

  @Column({ type: 'double precision' })
  timestamp: number;

  @Column({ nullable: false, default: 1000 })
  response_time: number;

  @Column()
  status: InboxStatus;

  @Column({ nullable: true })
  feedback_status: FeedbackStatus;

  @ManyToOne((type) => Intent, (intent) => intent.inboxes)
  intent: Intent;

  @ManyToOne((type) => User, (user) => user.inboxes)
  user: User;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: number;

  @Column({ type: 'double precision', nullable: true })
  feedback_timestamp: number;

  constructor() {
    this.status = InboxStatus.pending;
  }

  static getAttributesToSearch() {
    return ['question', 'response'];
  }
}
