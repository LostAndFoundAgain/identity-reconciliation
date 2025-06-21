import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class ContactDto {
  primaryContactId: number;
  emails: string[] = [];
  phoneNumbers: string[] = [];
  secondaryContactIds: number[] = [];
}

export class CreateIdentityResponseDto {
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contact: ContactDto;
}
