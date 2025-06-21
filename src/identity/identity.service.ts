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
    const newContact = new Identity();
    newContact.email = createIdentityDto.email;
    newContact.phoneNumber = createIdentityDto.phoneNumber;

    if (existingContacts.length) {
      return this.processExistingContacts(existingContacts, newContact);
    } else {
      return this.processNewContact(newContact);
    }
  }

  // User already exists
  async processExistingContacts(
    existingContacts: Identity[],
    newContact: Identity
  ) {
    newContact.linkPrecedence = SECONDARY;
    newContact.linkedId = existingContacts[0].id;
    existingContacts.push(newContact);
    const response =
      this.createContactResponseForRegisteredUser(existingContacts);

    // if request has new contact details
    if (
      response.contact.emails.length == existingContacts.length ||
      response.contact.phoneNumbers.length == existingContacts.length
    ) {
      const savedNewContact = await this.identityRepository.save(newContact);
      response.contact.secondaryContactIds.push(savedNewContact.id);
    }

    return response;
  }

  // User registration is new
  async processNewContact(newContact: Identity) {
    const savedNewContact = await this.identityRepository.save(newContact);
    const response = new CreateIdentityResponseDto();
    const contactDetails = new ContactDto();
    contactDetails.primaryContactId = savedNewContact.id;
    contactDetails.emails.push(savedNewContact.email);
    contactDetails.phoneNumbers.push(savedNewContact.phoneNumber);
    response.contact = contactDetails;
    return response;
  }

  private createContactResponseForRegisteredUser(existingContacts: Identity[]) {
    let emailSet = new Set<string>();
    let phoneNumberSet = new Set<string>();

    const response = new CreateIdentityResponseDto();
    const contactDetails = new ContactDto();

    for (const existingContact of existingContacts) {
      if (existingContact.linkPrecedence === PRIMARY) {
        contactDetails.primaryContactId = existingContact.id;
      } else if (existingContact.id) {
        contactDetails.secondaryContactIds.push(existingContact.id);
      }

      emailSet.add(existingContact.email);
      phoneNumberSet.add(existingContact.phoneNumber);
    }

    contactDetails.emails = [...emailSet];
    contactDetails.phoneNumbers = [...phoneNumberSet];

    response.contact = contactDetails;
    return response;
  }

  async find(email: string, phoneNumber: string): Promise<Identity[]> {
    return this.identityRepository.find({
      select: ["id", "email", "phoneNumber", "linkPrecedence"],
      where: [{ email }, { phoneNumber }],
    });
  }
}
