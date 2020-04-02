import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Knowledge } from "@core/entities/knowledge.entity";
import { Response } from "@core/entities/response.entity";

@Entity('intent')
export class Intent {
  @PrimaryColumn()
  id: string;

  @Column({nullable: true})
  category?: string;

  @Column({nullable: true})
  main_question?: string;

  @Column({default: 'active'})
  status: string;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;

  @OneToMany(type => Knowledge, knowledge => knowledge.intent)
  knowledges: Knowledge[];

  @OneToMany(type => Response, response => response.intent)
  responses: Response[];
}
