import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";

export class IntentModel {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsNotEmpty()
  main_question: string;

  @IsString()
  @IsNotEmpty()
  status: IntentStatus;
}
