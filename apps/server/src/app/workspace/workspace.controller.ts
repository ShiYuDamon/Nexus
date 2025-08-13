import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddWorkspaceMemberDto, UpdateWorkspaceMemberDto } from '@nexus-main/common';

@Controller('api/workspaces')
@UseGuards(JwtAuthGuard)export class
WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(@Request()req, @Body()createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspaceService.create(req.user.userId, createWorkspaceDto);
  }

  @Get()
  findAll(
    @Request()req,
    @Query('page', new ParseIntPipe({ optional: true }))page = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))limit = 10)
  {
    return this.workspaceService.findAll(req.user.userId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id')id: string, @Request()req) {
    return this.workspaceService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id')id: string,
    @Request()req,
    @Body()updateWorkspaceDto: UpdateWorkspaceDto)
  {
    return this.workspaceService.update(id, req.user.userId, updateWorkspaceDto);
  }

  @Delete(':id')
  remove(@Param('id')id: string, @Request()req) {
    return this.workspaceService.remove(id, req.user.userId);
  }

  @Post(':id/members')
  addMember(
    @Param('id')id: string,
    @Request()req,
    @Body()addMemberDto: AddWorkspaceMemberDto)
  {
    return this.workspaceService.addMember(id, req.user.userId, addMemberDto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id')id: string,
    @Param('memberId')memberId: string,
    @Request()req,
    @Body()updateMemberDto: UpdateWorkspaceMemberDto)
  {
    return this.workspaceService.updateMember(id, memberId, req.user.userId, updateMemberDto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id')id: string,
    @Param('memberId')memberId: string,
    @Request()req)
  {
    return this.workspaceService.removeMember(id, memberId, req.user.userId);
  }
}