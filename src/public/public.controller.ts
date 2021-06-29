import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatbotConfigService } from "../chatbot-config/chatbot-config.service";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ChatbotConfig } from "@core/entities/chatbot-config.entity";
import { plainToClass } from "class-transformer";
import camelcaseKeys = require("camelcase-keys");
import { PublicConfigDto } from "@core/dto/public-config.dto";
import { IntentDto } from "@core/dto/intent.dto";
import { IntentService } from "../intent/intent.service";
import { Intent } from "@core/entities/intent.entity";
import { FeedbackDto } from "@core/dto/feedback.dto";
import { FeedbackService } from "../feedback/feedback.service";
import snakecaseKeys = require("snakecase-keys/index");
import { Feedback } from "@core/entities/feedback.entity";
import { FaqService } from "../faq/faq.service";

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly _configService: ChatbotConfigService,
              private readonly _intentService: IntentService,
              private readonly _faqService: FaqService,
              private readonly _feedbackService: FeedbackService) {
  }

  @Get('')
  @ApiOperation({summary: 'Return the chatbot chatbot-config'})
  async getChabotConfig(): Promise<PublicConfigDto> {
    const config: ChatbotConfig = await this._configService.getChatbotConfig(
      {
        select: ['name', 'icon', 'function', 'primary_color', 'secondary_color', 'problematic', 'audience',
          'embedded_icon', 'description', 'help', 'help_btn', 'maintenance_mode', 'show_intent_search', 'dismiss_quick_replies',
          'show_feedback', 'block_type_text', 'show_reboot_btn', 'delay_between_messages', 'is_tree', 'show_faq', 'chat_btn', 'faq_btn']
      }
      );
    return config ? plainToClass(PublicConfigDto, camelcaseKeys(config, {deep: true})) : null;
  }

  @Get('/intents')
  @ApiOperation({summary: 'Return the firsts matching intents'})
  async getIntents(@Query('query') query: string,
                   @Query('intentsNumber') intentsNumber: number,
                   @Query('getResponses') getResponses: boolean): Promise<IntentDto[]> {
    const intents: Intent[] = await this._intentService.findIntentsMatching(decodeURIComponent(query), intentsNumber, getResponses);
    return plainToClass(IntentDto, camelcaseKeys(intents, {deep: true}));
  }

  @Post('/faq')
  @ApiOperation({summary: 'User connects to the FAQ'})
  async connectToFaq(@Body() body: { senderId: string }): Promise<void> {
    await this._faqService.connectToFaq(body.senderId);
    return;
  }

  @Post('/faq/:intentId')
  @ApiOperation({summary: 'User click an intent on the FAQ'})
  async clickIntent(@Body() body: { senderId: string },
                    @Param('intentId') intentId: string): Promise<void> {
    await this._faqService.clickIntent(body.senderId, intentId);
    return;
  }

  @Get('/categories')
  @ApiOperation({summary: 'Return all actives categories'})
  async getCategories(): Promise<string[]> {
    return await this._intentService.findAllCategories(true);
  }

  @Get('/category/:category')
  @ApiOperation({summary: 'Return intents of the category'})
  async getCategory(@Query() options: { senderId: string },
                    @Param('category') category: string): Promise<IntentDto[]> {
    await this._faqService.searchCategory(options.senderId, category);
    const intents: Intent[] = await this._intentService.findByCategory(decodeURIComponent(category));
    return plainToClass(IntentDto, camelcaseKeys(intents, {deep: true}));
  }

  @Post('/feedback')
  @ApiOperation({summary: 'Set a feedback from a chatbot response'})
  async createFeedback(@Body() feedbackDto: FeedbackDto): Promise<FeedbackDto> {
    const feedback = await this._feedbackService.createSafe(plainToClass(Feedback, snakecaseKeys(feedbackDto)));
    return plainToClass(FeedbackDto, camelcaseKeys(feedback, {deep: true}));
  }
}
