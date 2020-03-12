import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity('intent')
export class Intent {
  @PrimaryColumn()
  id: string;

  @Column({nullable: true})
  category?: string;

  @Column({nullable: true})
  main_question?: string;

  @Column({nullable: true})
  status?: string;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;
}
