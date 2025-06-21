import { Controller, Post, Body } from "@nestjs/common";
import { IdentityService } from "./contact.service";
import { CreateContactRequestDto } from "./dto/create-contact-request.dto";

@Controller("identity")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post("/identify")
  async create(@Body() createContactRequestDto: CreateContactRequestDto) {
    return await this.identityService.create(createContactRequestDto);
  }
}
