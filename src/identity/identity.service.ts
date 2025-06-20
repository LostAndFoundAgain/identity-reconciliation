import { Injectable } from "@nestjs/common";
import { CreateIdentityDto } from "./dto/create-identity.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Identity } from "./entities/identity.entity";
import { FindCursor, Repository } from "typeorm";

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Identity)
    private identityRepository: Repository<Identity>
  ) {}

  create(createIdentityDto: CreateIdentityDto) {
    // check if it already exists
    const dataExists = this.identityRepository.findOne({
      where: [
        { email: createIdentityDto.email },
        { phoneNumber: createIdentityDto.phoneNumber },
      ],
    });

    if (dataExists) {
      return dataExists;
    }
    return this.identityRepository.save(
      createIdentityDto as unknown as Identity
    );
  }

  // update(id: number, updateIdentityDto: UpdateIdentityDto) {
  //   return `This action updates a #${id} identity`;
  // }
}
