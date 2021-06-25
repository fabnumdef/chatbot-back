import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiKeyGuard } from "@core/guards/api-key.guard";
import { UpdateChatbotDto } from "@core/dto/update-chatbot.dto";
import { UpdateService } from "./update.service";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

@ApiTags('update')
@Controller('update')
@UseGuards(ApiKeyGuard)
export class UpdateController {

  constructor(private readonly _updateService: UpdateService) {
  }

  @Post('')
  @UseInterceptors(
    FileFieldsInterceptor([
      {name: 'env', maxCount: 1},
      {name: 'nginx_conf', maxCount: 1},
      {name: 'nginx_site', maxCount: 1}
    ], {
      limits: {
        // 1Mb
        fileSize: 1e+6
      }
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update the chatbot code',
    type: UpdateChatbotDto,
  })
  @ApiOperation({summary: 'Update the chatbot code'})
  async updateBot(@UploadedFiles() files,
                  @Body() updateChatbot: UpdateChatbotDto) {
    // @ts-ignore
    updateChatbot.updateFront = (updateChatbot.updateFront == 'true');
    // @ts-ignore
    updateChatbot.updateBack = (updateChatbot.updateBack == 'true');
    // @ts-ignore
    updateChatbot.updateRasa = (updateChatbot.updateRasa == 'true');
    // @ts-ignore
    updateChatbot.updateLogs = (updateChatbot.updateLogs == 'true');
    return await this._updateService.launchUpdate(updateChatbot, files);
  }

}
