import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Faq } from './entity/faq.entity';
import { FaqRepository } from './repository/faq.repository';

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(FaqRepository)
    private faqRepository: FaqRepository,
  ) {}

  async findAllFaq(): Promise<Faq[]> {
    const faqs = await this.faqRepository.findAllFaq();

    return faqs;
  }
}
