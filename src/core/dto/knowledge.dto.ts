import { IsNumber, IsOptional, IsString } from "class-validator";

export class KnowledgeDto {
  @IsNumber()
  @IsOptional()
  id: number;

  @IsString()
  intentId: string;

  @IsString()
  question: string;
}
