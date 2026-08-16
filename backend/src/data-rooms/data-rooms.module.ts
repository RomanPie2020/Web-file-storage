import { Module } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { DataRoomsController } from './data-rooms.controller';

@Module({
  providers: [DataRoomsService],
  controllers: [DataRoomsController],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}
