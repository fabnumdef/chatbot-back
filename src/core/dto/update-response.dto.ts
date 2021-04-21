import { IsNumber, IsOptional, IsString } from "class-validator";
import { ResponseType } from "@core/enums/response-type.enum";

export class UpdateResponseDto {
  @IsNumber()
  @IsOptional()
  id: number;

  @IsString()
  responseType: ResponseType;

  @IsString()
  response: string;
}
