import { Inbox } from '@core/entities/inbox.entity';
import { Knowledge } from '@core/entities/knowledge.entity';
import { Response } from '@core/entities/response.entity';
import { User } from '@core/entities/user.entity';
import { IntentStatus } from '@core/enums/intent-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('intent')
export class Intent {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column({ nullable: true, length: 255 })
  category?: string;

  @Column({ nullable: true, length: 255 })
  main_question?: string;

  @Index()
  @Column({ type:"enum", enum: IntentStatus, enumName: "IntentStatus", default: IntentStatus.to_deploy })
  status: IntentStatus;

  @Index()
  @Column({ nullable: false, default: false })
  hidden: boolean;

  @OneToMany((type) => Knowledge, (knowledge) => knowledge.intent, {
    cascade: true,
  })
  knowledges: Knowledge[];

  @OneToMany((type) => Response, (response) => response.intent, {
    cascade: true,
  })
  responses: Response[];

  @OneToMany((type) => Inbox, (inbox) => inbox.intent)
  inboxes: Inbox[];

  @ManyToOne((type) => User, (user) => user.intents)
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: number;

  constructor(id) {
    this.id = id;
  }

  static getAttributesToSearch() {
    return ['id', 'category', 'main_question'];
  }
}
