import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@nexus-main/database';
import { VersionChangeType } from '@prisma/client';
import * as diff from 'diff-match-patch';

export interface CreateVersionDto {
  documentId: string;
  title: string;
  content: string;
  changeType?: VersionChangeType;
  changeSummary?: string;
}

export interface VersionComparisonDto {
  fromVersionId: string;
  toVersionId: string;
}

export interface VersionDiff {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

@Injectable()export class
VersionsService {
  private dmp = new diff.diff_match_patch();

  constructor() {

    this.dmp.Diff_Timeout = 1.0;
    this.dmp.Diff_EditCost = 4;
  }




  async createVersion(data: CreateVersionDto, userId: string) {
    const { documentId, title, content, changeType = VersionChangeType.EDIT, changeSummary } = data;


    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }


    const nextVersionNumber = document.versions.length > 0 ?
    document.versions[0].versionNumber + 1 :
    1;


    let contentDiff: string | null = null;
    if (document.versions.length > 0) {
      const previousContent = document.versions[0].content;
      const diffs = this.dmp.diff_main(previousContent, content);
      this.dmp.diff_cleanupSemantic(diffs);
      contentDiff = this.dmp.diff_toDelta(diffs);
    }


    const version = await prisma.documentVersion.create({
      data: {
        versionNumber: nextVersionNumber,
        title,
        content,
        contentDiff,
        changeType,
        changeSummary,
        documentId,
        createdById: userId
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });


    await prisma.document.update({
      where: { id: documentId },
      data: { title, content, updatedAt: new Date() }
    });

    return version;
  }




  async getDocumentVersions(documentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
    prisma.documentVersion.findMany({
      where: { documentId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { versionNumber: 'desc' },
      skip,
      take: limit
    }),
    prisma.documentVersion.count({ where: { documentId } })]
    );

    return {
      versions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }




  async getVersion(versionId: string) {
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        document: {
          select: { id: true, title: true, workspaceId: true }
        }
      }
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    return version;
  }




  async compareVersions(fromVersionId: string, toVersionId: string): Promise<VersionDiff[]> {
    const [fromVersion, toVersion] = await Promise.all([
    this.getVersion(fromVersionId),
    this.getVersion(toVersionId)]
    );

    if (fromVersion.documentId !== toVersion.documentId) {
      throw new BadRequestException('不能比较不同文档的版本');
    }


    const diffs = this.dmp.diff_main(fromVersion.content, toVersion.content);
    this.dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([operation, text]) => ({
      type: operation === 1 ? 'added' : operation === -1 ? 'removed' : 'unchanged',
      content: text
    }));
  }




  async restoreVersion(versionId: string, userId: string) {
    const version = await this.getVersion(versionId);


    const restoredVersion = await this.createVersion({
      documentId: version.documentId,
      title: version.title,
      content: version.content,
      changeType: VersionChangeType.RESTORE,
      changeSummary: `恢复到版本 ${version.versionNumber}`
    }, userId);

    return restoredVersion;
  }




  async deleteVersion(versionId: string) {


    throw new BadRequestException('版本记录不能删除，以保持历史完整性');
  }




  async getVersionStats(documentId: string) {
    const stats = await prisma.documentVersion.groupBy({
      by: ['changeType'],
      where: { documentId },
      _count: { changeType: true }
    });

    const totalVersions = await prisma.documentVersion.count({
      where: { documentId }
    });

    return {
      totalVersions,
      changeTypeStats: stats.reduce((acc, stat) => {
        acc[stat.changeType] = stat._count.changeType;
        return acc;
      }, {} as Record<VersionChangeType, number>)
    };
  }
}