import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { ContactService } from "./contact.service";
import { CreateContactRequestDto } from "./dto/create-contact-request.dto";

@Controller("identity")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @HttpCode(HttpStatus.OK)
  @Post("/identify")
  async create(@Body() createContactRequestDto: CreateContactRequestDto) {
    Logger.debug(
      `POST /identify: ${JSON.stringify(createContactRequestDto)}`,
      ContactController.name
    );
    return await this.contactService.create(createContactRequestDto);
  }
}
