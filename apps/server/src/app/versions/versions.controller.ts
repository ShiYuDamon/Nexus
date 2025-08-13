import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe } from
'@nestjs/common';
import { VersionsService, CreateVersionDto, VersionComparisonDto } from './versions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/versions')
@UseGuards(JwtAuthGuard)export class
VersionsController {
  constructor(private readonly versionsService: VersionsService) {}




  @Post()
  async createVersion(@Body()createVersionDto: CreateVersionDto, @Request()req) {
    return this.versionsService.createVersion(createVersionDto, req.user.userId);
  }




  @Get('document/:documentId')
  async getDocumentVersions(
    @Param('documentId')documentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe)limit: number)
  {
    return this.versionsService.getDocumentVersions(documentId, page, limit);
  }




  @Get(':versionId')
  async getVersion(@Param('versionId')versionId: string) {
    return this.versionsService.getVersion(versionId);
  }




  @Post('compare')
  async compareVersions(@Body()comparisonDto: VersionComparisonDto) {
    return this.versionsService.compareVersions(
      comparisonDto.fromVersionId,
      comparisonDto.toVersionId
    );
  }




  @Post(':versionId/restore')
  async restoreVersion(@Param('versionId')versionId: string, @Request()req) {
    return this.versionsService.restoreVersion(versionId, req.user.userId);
  }




  @Get('document/:documentId/stats')
  async getVersionStats(@Param('documentId')documentId: string) {
    return this.versionsService.getVersionStats(documentId);
  }
}