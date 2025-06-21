import { Controller, Post, Body } from "@nestjs/common";
import { IdentityService } from "./identity.service";
import { CreateIdentityDto } from "./dto/create-identity.dto";

@Controller("identity")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post("/identify")
  async create(@Body() createIdentityDto: CreateIdentityDto) {
    return await this.identityService.create(createIdentityDto);
  }
}
