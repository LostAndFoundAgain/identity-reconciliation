import { BadRequestException, HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Contact } from "./entities/contact.entity";
import { In, Repository } from "typeorm";
import {
  ContactDto,
  CreateContactResponseDto,
} from "./dto/create-contact-response.dto";
import { PRIMARY, SECONDARY } from "./constants/common.constants";
import { CreateContactRequestDto } from "./dto/create-contact-request.dto";

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Contact)
    private identityRepository: Repository<Contact>
  ) {}

  async create(createContactRequestDto: CreateContactRequestDto) {
    try {
      // validate if both not null
      if (
        !createContactRequestDto.email &&
        !createContactRequestDto.phoneNumber
      ) {
        throw new BadRequestException(
          "Either [email] or [phoneNumber] must be provided"
        );
      }

      const directSecondaryContacts =
        await this.findIdentitiesByEmailPhoneNumberAndLinkPrecedence(
          createContactRequestDto.email,
          createContactRequestDto.phoneNumber,
          SECONDARY
        );

      const directPrimaryContacts =
        await this.findIdentitiesByEmailPhoneNumberAndLinkPrecedence(
          createContactRequestDto.email,
          createContactRequestDto.phoneNumber,
          PRIMARY
        );

      const primaryContactIdSet = new Set(
        directSecondaryContacts.map(
          (secondaryContact) => secondaryContact.linkedId
        )
      );

      directPrimaryContacts.forEach((primaryContact) =>
        primaryContactIdSet.add(primaryContact.id)
      );

      const allPrimaryContacts = [...primaryContactIdSet];

      // fetch complete list of contacts (primary + secondary)
      const allContacts = await this.identityRepository.find({
        where: [
          { id: In(allPrimaryContacts) },
          { linkedId: In(allPrimaryContacts) },
        ],
        order: { createdAt: "ASC" },
      });

      const newContact = new Contact();
      newContact.email = createContactRequestDto.email;
      newContact.phoneNumber = createContactRequestDto.phoneNumber;

      if (allContacts.length) {
        return this.processExistingContacts(allContacts, newContact);
      } else {
        return this.processNewContact(newContact);
      }
    } catch (exception) {
      throw new HttpException(
        `Request failed : ${exception.message}`,
        exception.status
      );
    }
  }

  // User already exists
  async processExistingContacts(
    existingContacts: Contact[],
    newContact: Contact
  ) {
    newContact.linkPrecedence = SECONDARY;
    const { response, shouldSaveNewContact } =
      await this.createContactResponseForRegisteredUser(
        existingContacts,
        newContact
      );

    newContact.linkedId = response.contact.primaryContactId;
    // if request has new contact details
    if (shouldSaveNewContact) {
      const savedNewContact = await this.identityRepository.save(newContact);
      response.contact.secondaryContactIds.push(savedNewContact.id);
    }

    return response;
  }

  // User registration is new
  async processNewContact(newContact: Contact) {
    // Considering a contact can be saved with either email or phoneNumber as null. Thus response will have null values also if
    // matched with any of email or phoneNumber
    const savedNewContact = await this.identityRepository.save(newContact);
    const response = new CreateContactResponseDto();
    const contactDetails = new ContactDto();
    contactDetails.primaryContactId = savedNewContact.id;
    contactDetails.emails.push(savedNewContact.email);
    contactDetails.phoneNumbers.push(savedNewContact.phoneNumber);
    response.contact = contactDetails;
    return response;
  }

  private async createContactResponseForRegisteredUser(
    existingContacts: Contact[],
    newContact: Contact
  ) {
    let newContactEmailExists = false;
    let newContactPhoneNumberExists = false;
    let shouldSaveNewContact = true;
    let emailSet = new Set<string>();
    let phoneNumberSet = new Set<string>();

    const response = new CreateContactResponseDto();
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

      emailSet.add(existingContact.email);
      phoneNumberSet.add(existingContact.phoneNumber);

      if (existingContact.email == newContact.email) {
        newContactEmailExists = true;
      }

      if (existingContact.phoneNumber == newContact.phoneNumber) {
        newContactPhoneNumberExists = true;
      }
    }

    if (newContact.email) {
      emailSet.add(newContact.email);
    }

    if (newContact.phoneNumber) {
      phoneNumberSet.add(newContact.phoneNumber);
    }

    contactDetails.emails = [...emailSet];
    contactDetails.phoneNumbers = [...phoneNumberSet];

    const newContactHasValidDetails =
      newContact.email && newContact.phoneNumber;
    const newContactHasNewInformation = !(
      newContactEmailExists && newContactPhoneNumberExists
    );

    shouldSaveNewContact =
      newContactHasValidDetails && newContactHasNewInformation;

    response.contact = contactDetails;
    await this.convertContactTypeAndLinkedId(
      primaryToSecondaryConversionList,
      contactDetails.primaryContactId
    );
    return { response, shouldSaveNewContact };
  }

  async convertContactTypeAndLinkedId(ids: string[], linkedId: number) {
    if (!ids.length) {
      return;
    }

    return await this.identityRepository
      .createQueryBuilder()
      .update(Contact)
      .set({
        linkPrecedence: SECONDARY,
        linkedId,
      })
      .where("id IN (:...ids)", { ids })
      .orWhere("linkedId IN (:...ids)", { ids })
      .execute();
  }

  async findIdentitiesByEmailPhoneNumberAndLinkPrecedence(
    email: string | null,
    phoneNumber: string | null,
    linkPrecedence: string
  ): Promise<Contact[]> {
    const query = this.identityRepository
      .createQueryBuilder("contact")
      .select([
        "contact.id",
        "contact.email",
        "contact.phoneNumber",
        "contact.linkPrecedence",
        "contact.linkedId",
      ])
      .where("contact.linkPrecedence = :linkPrecedence", { linkPrecedence });

    if (email && phoneNumber) {
      query.andWhere(
        "(contact.email = :email OR contact.phoneNumber = :phoneNumber)",
        { email, phoneNumber }
      );
    } else if (email) {
      query.andWhere("contact.email = :email", { email });
    } else if (phoneNumber) {
      query.andWhere("contact.phoneNumber = :phoneNumber", { phoneNumber });
    }
    return query.getMany();
  }
}

// {
//   email : abcd,
//   phoneNumber : 1
//   linkPrecedence : "primary"
// }

// {
//   email : zzzz,
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
