import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";
import { InboxStatus } from "@core/enums/inbox-status.enum";

@Entity('inbox')
export class Inbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event_id: number;

  @Column({type: 'double precision'})
  confidence: number;

  @Column()
  question: string;

  @Column({type: 'text'})
  response: any;

  @Column()
  sender_id: string;

  @Column({type: 'double precision'})
  timestamp: number;

  @Column()
  status: InboxStatus;

  @ManyToOne(type => Intent, intent => intent.inboxes)
  intent: Intent;

  @CreateDateColumn()
  created_at: string;

  constructor() {
    this.status = InboxStatus.pending;
  }

}
