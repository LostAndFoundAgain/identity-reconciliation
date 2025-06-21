import { Injectable } from "@nestjs/common";
import { CreateIdentityDto } from "./dto/create-identity.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Identity } from "./entities/identity.entity";
import { In, Repository } from "typeorm";
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
    const response = await this.createContactResponseForRegisteredUser(
      existingContacts,
      newContact
    );

    // if request has new contact details
    if (
      response.contact.emails.length > existingContacts.length ||
      response.contact.phoneNumbers.length > existingContacts.length
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

  private async createContactResponseForRegisteredUser(
    existingContacts: Identity[],
    newContact: Identity
  ) {
    let emailSet = new Set<string>();
    let phoneNumberSet = new Set<string>();

    const response = new CreateIdentityResponseDto();
    const contactDetails = new ContactDto();

    let primaryToSecondaryConversionList = [];

    for (const existingContact of existingContacts) {
      if (existingContact.linkPrecedence === PRIMARY) {
        if (existingContact.id !== existingContacts[0].id) {
          // this is not the oldest contact
          primaryToSecondaryConversionList.push(existingContact.id);
          existingContact.linkPrecedence = SECONDARY;
          existingContact.linkedId = existingContacts[0].id;
          contactDetails.secondaryContactIds.push(existingContact.id);
        } else {
          contactDetails.primaryContactId = existingContact.id;
        }
      } else {
        contactDetails.secondaryContactIds.push(existingContact.id);
      }

      // This is not needed since all the contacts already stored must have different values for email and ph 
      // emailSet.add(existingContact.email);
      // phoneNumberSet.add(existingContact.phoneNumber);
    }

    emailSet.add(newContact.email);
    phoneNumberSet.add(newContact.phoneNumber);

    contactDetails.emails = [...emailSet];
    contactDetails.phoneNumbers = [...phoneNumberSet];

    response.contact = contactDetails;
    await this.convertContactType(primaryToSecondaryConversionList);
    return response;
  }

  async convertContactType(ids: string[]) {
    return await this.identityRepository.update(
      { id: In(ids) },
      { linkPrecedence: SECONDARY }
    );
  }

  async find(email: string, phoneNumber: string): Promise<Identity[]> {
    return this.identityRepository.find({
      select: ["id", "email", "phoneNumber", "linkPrecedence"],
      where: [{ email }, { phoneNumber }],
    });
  }
}

// {
//   email : abcd,
//   phoneNumber : 1
//   linkPrecedence : "primary"
// }

// {
//   email : abcd,
//   phoneNumber : 2
//   linkPrecedence : "secondary"
// }

// // what if new request comes like this

// {
//   email : xxxx
//   phoneNumber : 2
// }

// This should be linked with phone Number 1 guy also
// The important thing is if we get a primary contact in our result then we are getting all of the contacts
// But if not that means there are other indirect contacts which we have to search for. So basically we have to search on the basis
// of primary contact to get all the contacts
// Since each of the existing records are already linked to primary contact we will just need to query DB twice.

