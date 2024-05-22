import { Intent } from '@core/entities/intent.entity';
import { User } from '@core/entities/user.entity';
import { FeedbackStatus } from '@core/enums/feedback-status.enum';
import { InboxStatus } from '@core/enums/inbox-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('inbox')
export class Inbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event_id: number;

  @Index()
  @Column({ type: 'double precision' })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  intent_ranking: any;

  @Index()
  @Column({ length: 2000 })
  question: string;

  @Index()
  @Column({ type: 'text' })
  response: any;

  @Column({ length: 255 })
  sender_id: string;

  @Index()
  @Column({ type: 'double precision' })
  timestamp: number;

  @Column({ nullable: false, default: 1000 })
  response_time: number;

  @Index()
  @Column({ type: "enum", enumName: "InboxStatus", enum: InboxStatus, default: InboxStatus.pending })
  status: InboxStatus;

  @Index()
  @Column({ type:"enum", enumName: "FeedbackStatus", enum: FeedbackStatus, nullable: true })
  feedback_status: FeedbackStatus;

  @ManyToOne((type) => Intent, (intent) => intent.inboxes)
  intent: Intent;

  @Index()
  @ManyToOne((type) => User, (user) => user.inboxes)
  user: User;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  created_at: number;

  @Index()
  @Column({ type: 'double precision', nullable: true })
  feedback_timestamp: number;

  constructor() {
    this.status = InboxStatus.pending;
  }

  static getAttributesToSearch() {
    return ['question', 'response'];
  }
}
