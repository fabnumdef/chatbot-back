import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigUpdateDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary' })
  icon: any;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  function: string;

  @IsHexColor()
  @IsOptional()
  @MaxLength(20)
  primaryColor: string;

  @IsHexColor()
  @IsOptional()
  @MaxLength(20)
  secondaryColor: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  problematic: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  audience: string;

  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary' })
  embeddedIcon: any;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  help: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  helpBtn: string;

  @IsString()
  @IsOptional()
  @MaxLength(25)
  chatBtn: string;

  @IsString()
  @IsOptional()
  @MaxLength(25)
  faqBtn: string;

  @IsString()
  @IsOptional()
  storage: string;

  @IsString()
  @IsOptional()
  domainName: string;

  @IsString()
  @IsOptional()
  showIntentSearch: boolean;

  @IsString()
  @IsOptional()
  dismissQuickReplies: boolean;

  @IsString()
  @IsOptional()
  showFeedback: boolean;

  @IsString()
  @IsOptional()
  blockTypeText: boolean;

  @IsString()
  @IsOptional()
  showRebootBtn: boolean;

  @IsString()
  @IsOptional()
  delayBetweenMessages: number;

  @IsString()
  @IsOptional()
  isTree: boolean;

  @IsString()
  @IsOptional()
  showFaq: boolean;

  @IsString()
  @IsOptional()
  showFallbackSuggestions: boolean;
}
