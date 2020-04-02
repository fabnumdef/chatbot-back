import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Intent } from "@core/entities/intent.entity";

@Entity('knowledge')
export class Knowledge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @ManyToOne(type => Intent, intent => intent.knowledges)
  intent: string;

  @Column({ nullable: false })
  question: string;
}
