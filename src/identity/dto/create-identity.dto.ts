import { IsEmail, IsPhoneNumber } from "class-validator";

export class CreateIdentityDto {
  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phoneNumber?: number;
}
