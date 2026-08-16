import { Module } from '@nestjs/common'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'
import { SharingModule } from '../sharing/sharing.module'

@Module({ imports: [SharingModule], controllers: [FilesController], providers: [FilesService] })
export class FilesModule {}
