import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateChatbotDto {
  @IsBoolean()
  @IsNotEmpty()
  updateFront: boolean;

  @IsBoolean()
  @IsNotEmpty()
  updateBack: boolean;

  @IsBoolean()
  @IsNotEmpty()
  updateRasa: boolean;

  @IsString()
  @IsOptional()
  frontBranch: string = 'master';

  @IsString()
  @IsOptional()
  backBranch: string = 'master';

  @IsString()
  @IsOptional()
  botBranch: string = 'master';

  @IsOptional()
  @ApiProperty({type: 'string', format: 'binary'})
  nginx_conf: any;

  @IsOptional()
  @ApiProperty({type: 'string', format: 'binary'})
  nginx_site: any;

  @IsOptional()
  @ApiProperty({type: 'string', format: 'binary'})
  env: any;
}
