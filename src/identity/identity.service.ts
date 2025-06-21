import { Injectable } from "@nestjs/common";
import { CreateIdentityDto } from "./dto/create-identity.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Identity } from "./entities/identity.entity";
import { Repository } from "typeorm";
import {
  ContactDto,
  CreateIdentityResponseDto,
} from "./dto/create-identity-response.dto";

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Identity)
    private identityRepository: Repository<Identity>
  ) {}

  async create(createIdentityDto: CreateIdentityDto) {
    const existingContacts = await this.find(
      createIdentityDto.email,
      createIdentityDto.phoneNumber
    );
    const contactToSave = { ...createIdentityDto } as Identity;

    if (existingContacts) {
      contactToSave.linkPrecedence = "secondary";
      contactToSave.linkedId = existingContacts[0].id;
    }

    const savedNewContact = await this.identityRepository.save(contactToSave);
    existingContacts.push(savedNewContact);
    return this.createContactResponse(existingContacts);
  }

  find(email: string, phoneNumber: string): Promise<Identity[]> {
    return this.identityRepository.find({
      where: [{ email }, { phoneNumber }],
    });
  }

  createContactResponse(existingContacts: Identity[]) {
    const createIdentityResponseDto = new CreateIdentityResponseDto();
    const contactDetails = new ContactDto();

    contactDetails.primaryContactId = existingContacts[0].id;

    for (const existingContact of existingContacts) {
      if (existingContact.linkPrecedence === "primary") {
        contactDetails.primaryContactId = existingContact.id;
      } else {
        contactDetails.secondaryContactIds.push(existingContact.id);
      }

      contactDetails.emails.push(existingContact.email);
      contactDetails.phoneNumbers.push(existingContact.phoneNumber);
    }

    createIdentityResponseDto.contact = contactDetails;
    return createIdentityResponseDto;
  }
}
