import { IsOptional } from 'class-validator';

export class IntentFilterDto {
  @IsOptional()
  categories?: string[];

  @IsOptional()
  users?: string[];

  @IsOptional()
  intentInError?: boolean;

  @IsOptional()
  hidden?: boolean;

  @IsOptional()
  expiresAt?: string;

  @IsOptional()
  expires?: boolean;
}
