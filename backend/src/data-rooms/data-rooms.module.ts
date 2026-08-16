import { Module } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';

@Module({
  providers: [DataRoomsService],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}
