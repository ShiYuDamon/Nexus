import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe } from
'@nestjs/common';
import { CommentsService, CreateCommentDto, UpdateCommentDto } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/comments')
@UseGuards(JwtAuthGuard)export class
CommentsController {
  constructor(private readonly commentsService: CommentsService) {}




  @Post()
  async createComment(@Body()createCommentDto: CreateCommentDto, @Request()req) {
    return this.commentsService.createComment(createCommentDto, req.user.userId);
  }




  @Get()
  async getComments(
    @Query('documentId')documentId: string,
    @Query('blockId')blockId?: string,
  includeResolved: boolean = false)
  {
    if (!documentId) {
      throw new Error('documentId is required');
    }

    if (blockId) {

      return this.commentsService.getBlockComments(documentId, blockId, includeResolved);
    } else {

      return this.commentsService.getDocumentComments(documentId, includeResolved);
    }
  }




  @Get('document/:documentId')
  async getDocumentComments(
    @Param('documentId')documentId: string,
    @Query('includeResolved', new DefaultValuePipe(false), ParseBoolPipe)includeResolved: boolean)
  {
    return this.commentsService.getDocumentComments(documentId, includeResolved);
  }




  @Get('document/:documentId/block/:blockId')
  async getBlockComments(
    @Param('documentId')documentId: string,
    @Param('blockId')blockId: string,
  includeResolved: boolean = true)
  {
    return this.commentsService.getBlockComments(documentId, blockId, includeResolved);
  }




  @Get('document/:documentId/blocks')
  async getAllBlockComments(
    @Param('documentId')documentId: string,
  includeResolved: boolean = false)
  {
    return this.commentsService.getAllBlockComments(documentId, includeResolved);
  }




  @Get('document/:documentId/inline')
  async getInlineComments(
    @Param('documentId')documentId: string,
    @Query('startPosition', ParseIntPipe)startPosition?: number,
    @Query('endPosition', ParseIntPipe)endPosition?: number)
  {
    return this.commentsService.getInlineComments(documentId, startPosition, endPosition);
  }




  @Put(':commentId')
  async updateComment(
    @Param('commentId')commentId: string,
    @Body()updateCommentDto: UpdateCommentDto,
    @Request()req)
  {
    return this.commentsService.updateComment(commentId, updateCommentDto, req.user.userId);
  }




  @Delete(':commentId')
  async deleteComment(@Param('commentId')commentId: string, @Request()req) {
    return this.commentsService.deleteComment(commentId, req.user.userId);
  }




  @Put(':commentId/toggle-resolution')
  async toggleCommentResolution(@Param('commentId')commentId: string, @Request()req) {
    return this.commentsService.toggleCommentResolution(commentId, req.user.userId);
  }




  @Get('document/:documentId/stats')
  async getCommentStats(@Param('documentId')documentId: string) {
    return this.commentsService.getCommentStats(documentId);
  }




  @Get('document/:documentId/counts')
  async getBlockCommentCounts(
    @Param('documentId')documentId: string,
  includeResolved: boolean = false)
  {
    return this.commentsService.getBlockCommentCounts(documentId, includeResolved);
  }




  @Get('version/:versionId/count')
  async getVersionCommentCount(@Param('versionId')versionId: string) {
    return this.commentsService.getVersionCommentCount(versionId);
  }




  @Get('version/:versionId')
  async getVersionComments(
    @Param('versionId')versionId: string,
  includeResolved: boolean = false)
  {
    return this.commentsService.getVersionComments(versionId, includeResolved);
  }




  @Get('document/:documentId/history')
  async getDocumentCommentHistory(
    @Param('documentId')documentId: string,
  includeResolved: boolean = false)
  {
    return this.commentsService.getDocumentCommentHistory(documentId, includeResolved);
  }




  @Post('version')
  async createVersionComment(@Body()createCommentDto: any, @Request()req) {
    return this.commentsService.createVersionComment(createCommentDto, req.user.userId);
  }
}