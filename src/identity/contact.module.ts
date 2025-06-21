import { Module } from '@nestjs/common';
import { IdentityService } from './contact.service';
import { IdentityController } from './contact.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';

@Module({
  imports :[TypeOrmModule.forFeature([Contact])],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
