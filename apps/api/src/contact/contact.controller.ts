import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { ContactService } from "./contact.service";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateContactMessageDto): Promise<void> {
    await this.contactService.create(dto);
  }
}
