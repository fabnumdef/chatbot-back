import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Inbox } from '@core/entities/inbox.entity';
import { Intent } from '@core/entities/intent.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('chatbot_user')
export class User {
  @PrimaryColumn({ nullable: false, length: 200 })
  email: string;

  @Column({ select: false, nullable: true, length: 200 })
  password: string;

  @Column({ nullable: false, default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lock_until: number;

  @Column({ nullable: false, length: 50 })
  first_name: string;

  @Column({ nullable: false, length: 50 })
  last_name: string;

  @Column({ nullable: true, length: 50 })
  function: string;

  @Column({
    name: 'role',
    type: 'enum',
    enumName: 'UserRole',
    enum: UserRole,
    default: UserRole.reader,
    nullable: false,
  })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: number;

  @Column({ nullable: true, length: 255 })
  reset_password_token: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_password_expires: number;

  @OneToMany((type) => Inbox, (inbox) => inbox.user)
  inboxes: Inbox[];

  @OneToMany((type) => Intent, (intent) => intent.user)
  intents: Intent[];

  @Column({ default: false })
  disabled: boolean;

  @Column({ type: "timestamptz", nullable: true })
  end_date: Date | null;
}
