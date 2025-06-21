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

  async create(createIdentityDto: CreateIdentityDto) {
    const primaryContactExists = await this.findOne(
      createIdentityDto.email,
      createIdentityDto.phoneNumber
    );
    const contactToSave = { ...createIdentityDto } as Identity;

    if (primaryContactExists) {
      contactToSave.linkPrecedence = "secondary";
      contactToSave.linkedId = primaryContactExists.id;
    }

    return this.identityRepository.save(contactToSave);
  }

  findOne(email: string, phoneNumber: string): Promise<Identity> {
    return this.identityRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });
  }
}
