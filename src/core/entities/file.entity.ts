import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('file_historic')
export class FileHistoric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, length: 50 })
  name: string;

  @CreateDateColumn({type: 'timestamp'})
  created_at: number;
}
