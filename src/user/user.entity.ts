import { Entity, Column, PrimaryColumn } from 'typeorm';
import { UserRole } from "./user-role.enum";

@Entity()
export class User {
  @PrimaryColumn()
  email: string;

  @Column()
  password: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  function: string;

  @Column('enum', { name: 'role', enum: UserRole})
  role: UserRole;
}
