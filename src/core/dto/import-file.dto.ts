import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ImportFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @IsString()
  @IsNotEmpty()
  deleteIntents: boolean = false;
}
