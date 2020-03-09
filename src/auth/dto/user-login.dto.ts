import { ApiModelProperty } from "@nestjs/swagger/dist/decorators/api-model-property.decorator";

export class UserLoginDto {
  @ApiModelProperty({ example: 'username@example.com', description: 'email de l\'utilisateur' })
  readonly username: string;

  @ApiModelProperty({
    example: '123456',
    description: 'mot de passe de l\'utilisateur',
  })
  readonly password: string;
}
