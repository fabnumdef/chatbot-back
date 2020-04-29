import { IsOptional, IsString } from "class-validator";

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  page: number = 1;

  @IsOptional()
  limit: number = 20;
}
