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
  elastic_host: string;

  @IsString()
  @IsOptional()
  elastic_username: string;

  @IsString()
  @IsOptional()
  elastic_password: string;

  @IsString()
  @IsOptional()
  elastic_metricbeat_index: string;

  @IsString()
  @IsOptional()
  elastic_packetbeat_index: string;

  @IsString()
  @IsOptional()
  elastic_filebeat_index: string;

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
