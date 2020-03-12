import { IsNumber, IsOptional, IsString } from "class-validator";
import { ResponseType } from "@core/entity/response-type.enum";

export class ResponseDto {
  @IsNumber()
  @IsOptional()
  id: number;

  @IsString()
  intent: string;

  @IsString()
  response_type: ResponseType;

  @IsString()
  response: string;
}
