import { Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('icon')
@Unique(['name'])
export class Knowledge {
  @PrimaryColumn({ nullable: false, length: 50 })
  name: string;
}
