import { IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  page = 1;

  @IsOptional()
  limit = 20;
}
