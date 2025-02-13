import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { Faq } from './entity/faq.entity';
import { FaqsService } from './faqs.service';
import { Role } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('faqs')
@ApiTags('Faqs')
export class FaqsController {
  private logger = new Logger('FaqsController');
  constructor(private faqsService: FaqsService) {}

  @Get()
  async readFaqs(): Promise<Faq[]> {
    const response = await this.faqsService.readFaqs();

    return Object.assign({
      statusCode: 200,
      msg: `전체 FAQ가 조회되었습니다.`,
      response,
    });
  }

  @Post()
  @Role(true)
  @UseGuards(RolesGuard)
  @UseGuards(AuthGuard())
  async createFaq(@Body() createFaqDto: CreateFaqDto) {
    const response = await this.faqsService.createFaq(createFaqDto);

    return Object.assign({
      statusCode: 201,
      msg: `FAQ 생성 완료`,
      response,
    });
  }

  @Patch('/:faqNo')
  @Role(true)
  @UseGuards(RolesGuard)
  @UseGuards(AuthGuard())
  async updateFaq(
    @Param('faqNo') no: number,
    @Body() updateFaqDto: UpdateFaqDto,
  ) {
    const response = await this.faqsService.updateFaq(no, updateFaqDto);

    return Object.assign({
      statusCode: 204,
      msg: `FAQ 수정 완료`,
      response,
    });
  }

  @Delete('/:faqNo')
  @Role(true)
  @UseGuards(RolesGuard)
  @UseGuards(AuthGuard())
  async deleteFaq(@Param('faqNo') no: number) {
    const response = await this.faqsService.deleteFaq(no);

    return Object.assign({
      statusCode: 204,
      msg: `FAQ 삭제 완료`,
      response,
    });
  }
}
