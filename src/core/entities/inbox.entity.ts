import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";
import { User } from "@core/entities/user.entity";

@Entity('inbox')
export class Inbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event_id: number;

  @Column({type: 'double precision'})
  confidence: number;

  @Column({length: 2000})
  question: string;

  @Column({type: 'text'})
  response: any;

  @Column({length: 255})
  sender_id: string;

  @Column({type: 'double precision'})
  timestamp: number;

  @Column({ nullable: false, default: 1000 })
  response_time: number;

  @Column()
  status: InboxStatus;

  @ManyToOne(type => Intent, intent => intent.inboxes)
  intent: Intent;

  @ManyToOne(type => User, user => user.inboxes)
  user: User;

  @CreateDateColumn({type: 'timestamp'})
  created_at: number;

  constructor() {
    this.status = InboxStatus.pending;
  }

  static getAttributesToSearch() {
    return ['question', 'response'];
  }

}
