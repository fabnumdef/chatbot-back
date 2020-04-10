import { IsOptional, IsString } from "class-validator";

export class PaginationQueryDto {
  @IsString()
  @IsOptional()
  query: string;
}
