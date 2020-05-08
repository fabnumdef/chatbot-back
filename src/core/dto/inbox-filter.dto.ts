import { IsOptional } from "class-validator";

export class InboxFilterDto {
  @IsOptional()
  categories: string[];

  @IsOptional()
  expiresAt: string;

  @IsOptional()
  expires: boolean;
}
