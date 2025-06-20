import { Injectable } from "@nestjs/common";
import { CreateIdentityDto } from "./dto/create-identity.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Identity } from "./entities/identity.entity";
import { Repository } from "typeorm";

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Identity)
    private identityRepository: Repository<Identity>
  ) {}

  create(createIdentityDto: CreateIdentityDto) {
    return this.identityRepository.save(
      createIdentityDto as unknown as Identity
    );
  }

  // update(id: number, updateIdentityDto: UpdateIdentityDto) {
  //   return `This action updates a #${id} identity`;
  // }
}
