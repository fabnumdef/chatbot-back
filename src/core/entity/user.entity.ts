import { Entity, Column, PrimaryColumn } from 'typeorm';
import { UserRole } from "../enum/user-role.enum";

@Entity('user')
export class User {
  @PrimaryColumn()
  email: string;

  @Column({ select: false })
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
