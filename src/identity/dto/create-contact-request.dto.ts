import { IsEmail, IsPhoneNumber } from "class-validator";

export class CreateContactRequestDto {
  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phoneNumber?: string;
}
