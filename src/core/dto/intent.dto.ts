import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { IntentStatus } from "@core/enums/intent-status.enum";

export class IntentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  mainQuestion?: string;

  @IsString()
  @IsOptional()
  status?: IntentStatus;

  @IsNumber()
  @IsOptional()
  createdAt?: number;
}
