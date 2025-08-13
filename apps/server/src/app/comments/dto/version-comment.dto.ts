import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateVersionCommentDto {
  @IsString()
  content: string;

  @IsString()
  documentId: string;

  @IsString()
  versionId: string;

  @IsOptional()
  @IsString()
  blockId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class GetVersionCommentsDto {
  @IsOptional()
  @IsBoolean()
  includeResolved?: boolean = false;
}

export class CommentHistoryQueryDto {
  @IsOptional()
  @IsBoolean()
  includeResolved?: boolean = false;

  @IsOptional()
  @IsString()
  versionId?: string;
}