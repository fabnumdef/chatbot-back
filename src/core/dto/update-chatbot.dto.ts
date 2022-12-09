import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateChatbotDto {
  @IsString()
  @IsNotEmpty()
  updateFront: boolean;

  @IsString()
  @IsNotEmpty()
  updateBack: boolean;

  @IsString()
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

  @IsString()
  @IsOptional()
  domainName: string;

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

export class UpdateDomainNameDto {
  @IsString()
  @IsNotEmpty()
  domainName: string;

  @IsString()
  @IsNotEmpty()
  userPassword: string;
}
