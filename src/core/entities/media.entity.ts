import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('media')
@Unique(['file'])
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  file: string;

  @CreateDateColumn({type: "timestamp"})
  created_at: number;
}
