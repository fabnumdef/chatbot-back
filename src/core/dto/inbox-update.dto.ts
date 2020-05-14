import { IsObject, IsOptional } from "class-validator";
import { Intent } from "@core/entities/intent.entity";

export class InboxUpdateDto {
  @IsObject()
  @IsOptional()
  intent: Intent;
}
