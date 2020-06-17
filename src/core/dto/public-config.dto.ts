import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { FileUploadDto } from "@core/dto/file-upload.dto";

export class PublicConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({type: 'string', format: 'binary'})
  icon: FileUploadDto;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  function: string;

  @IsHexColor()
  @IsNotEmpty()
  @MaxLength(20)
  primaryColor: string;

  @IsHexColor()
  @IsNotEmpty()
  @MaxLength(20)
  secondaryColor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  problematic: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  audience: string;
}
