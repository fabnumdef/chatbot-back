import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { UserRole } from "../enums/user-role.enum";

@Entity('chatbot_user')
export class User {
  @PrimaryColumn({ nullable: false })
  email: string;

  @Column({ select: false, nullable: true })
  password: string;

  @Column({ nullable: false })
  first_name: string;

  @Column({ nullable: false })
  last_name: string;

  @Column({ nullable: true })
  function: string;

  @Column('enum', { name: 'role', enum: UserRole, default: UserRole.reader, nullable: false})
  role: UserRole;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  @Column({ nullable: true })
  reset_password_token: string;

  @Column({type: "timestamp", nullable: true})
  reset_password_expires: number;
}
