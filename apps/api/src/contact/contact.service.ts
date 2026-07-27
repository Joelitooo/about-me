import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateContactMessageDto } from "./dto/create-contact-message.dto";

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactMessageDto): Promise<void> {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
      },
    });
  }
}
