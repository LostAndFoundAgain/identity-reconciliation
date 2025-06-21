import { Injectable } from "@nestjs/common";
import { CreateIdentityDto } from "./dto/create-identity.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Identity } from "./entities/identity.entity";
import { Repository } from "typeorm";
import {
  ContactDto,
  CreateIdentityResponseDto,
} from "./dto/create-identity-response.dto";
import { PRIMARY, SECONDARY } from "./constants/common.constants";

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
    const newContact = { ...createIdentityDto } as Identity;

    if (existingContacts.length) {
      newContact.linkPrecedence = SECONDARY;
      newContact.linkedId = existingContacts[0].id;
    }

    const { response, isNewContactDifferent } = this.createContactResponse(
      existingContacts,
      newContact
    );

    if (isNewContactDifferent) {
      const newContactSaved = await this.identityRepository.save(newContact);
      if (newContactSaved.linkPrecedence === PRIMARY) {
        response.contact.primaryContactId = newContactSaved.id;
      } else {
        response.contact.secondaryContactIds.push(newContactSaved.id);
      }
      response.contact.emails.push(newContactSaved.email);
      response.contact.phoneNumbers.push(newContactSaved.phoneNumber);
    }

    return response;
  }

  private createContactResponse(
    existingContacts: Identity[],
    newContact: Identity
  ): { response: CreateIdentityResponseDto; isNewContactDifferent: boolean } {
    let isNewContactDifferent = true;

    const response = new CreateIdentityResponseDto();
    const contactDetails = new ContactDto();

    for (const existingContact of existingContacts) {
      if (existingContact.linkPrecedence === PRIMARY) {
        contactDetails.primaryContactId = existingContact.id;
      } else {
        contactDetails.secondaryContactIds.push(existingContact.id);
      }

      contactDetails.emails.push(existingContact.email);
      contactDetails.phoneNumbers.push(existingContact.phoneNumber);

      if (
        existingContact.email == newContact.email &&
        existingContact.phoneNumber == newContact.phoneNumber
      ) {
        isNewContactDifferent = false;
      }
    }

    response.contact = contactDetails;
    return { response, isNewContactDifferent };
  }

  async find(email: string, phoneNumber: string): Promise<Identity[]> {
    return this.identityRepository.find({
      where: [{ email }, { phoneNumber }],
    });
  }
}
