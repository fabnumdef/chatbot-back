import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entity/intent.entity";

@Entity('knowledge')
export class Knowledge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @OneToOne(type => Intent, intent => intent.id)
  intent: string;

  @Column()
  question: string;
}
