import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { Intent } from "@core/entities/intent.entity";
import { IntentModel } from "@core/models/intent.model";

export class MediaModel {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  file: string;

  @IsNumber()
  @IsNotEmpty()
  size: number;

  @IsString()
  @IsNotEmpty()
  added_by: string;

  @IsNumber()
  @IsOptional()
  created_at?: number;

  @IsObject()
  @IsOptional()
  intents?: IntentModel[];
}
