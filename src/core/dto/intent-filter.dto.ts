import { IsOptional } from "class-validator";

export class IntentFilterDto {
  @IsOptional()
  categories: string[];

  @IsOptional()
  intentInError: boolean;

  @IsOptional()
  expiresAt: string;

  @IsOptional()
  expires: boolean;
}
