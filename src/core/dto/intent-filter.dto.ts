import { IsOptional } from "class-validator";

export class IntentFilterDto {
  @IsOptional()
  categories: string[];

  @IsOptional()
  expiresAt: string;

  @IsOptional()
  expires: boolean;
}
