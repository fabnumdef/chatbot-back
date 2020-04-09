import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";

export class KnowledgeModel {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  intentId: string;

  @IsString()
  @IsNotEmpty()
  question: string;
}
