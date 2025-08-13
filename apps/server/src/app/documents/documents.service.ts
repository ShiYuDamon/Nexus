import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentDto,
  DocumentListResponseDto,
  DocumentDetailDto } from
'@nexus-main/common';

@Injectable()export class
DocumentsService {
  constructor(private prisma: PrismaService) {}


  async create(
  createDocumentDto: CreateDocumentDto,
  userId: string)
  : Promise<DocumentDto> {
    const document = await this.prisma.document.create({
      data: {
        title: createDocumentDto.title,
        content: createDocumentDto.content || '',
        workspace: {
          connect: { id: createDocumentDto.workspaceId }
        },
        author: {
          connect: { id: userId }
        }
      }
    });

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      workspaceId: document.workspaceId,
      authorId: document.authorId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }


  async findByWorkspace(
  workspaceId: string,
  page = 1,
  limit = 10)
  : Promise<DocumentListResponseDto> {
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
    this.prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    }),
    this.prisma.document.count({ where: { workspaceId } })]
    );

    return {
      items: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        workspaceId: doc.workspaceId,
        authorId: doc.authorId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
      })),
      total,
      page,
      limit
    };
  }


  async findOne(id: string): Promise<DocumentDetailDto> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      workspaceId: document.workspaceId,
      authorId: document.authorId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      author: {
        id: document.author.id,
        name: document.author.name,
        email: document.author.email
      },
      workspace: {
        id: document.workspace.id,
        name: document.workspace.name
      }
    };
  }


  async update(
  id: string,
  updateDocumentDto: UpdateDocumentDto)
  : Promise<DocumentDto> {
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(updateDocumentDto.title && { title: updateDocumentDto.title }),
        ...(updateDocumentDto.content !== undefined && {
          content: updateDocumentDto.content
        })
      }
    });

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      workspaceId: document.workspaceId,
      authorId: document.authorId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  }


  async remove(id: string): Promise<void> {
    await this.prisma.document.delete({
      where: { id }
    });
  }


  async checkUserAccess(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: {
            users: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!document) {
      return false;
    }


    if (document.authorId === userId) {
      return true;
    }


    return document.workspace.users.length > 0;
  }


  async findRecentByUser(
  userId: string,
  limit = 5)
  : Promise<DocumentListResponseDto> {

    const userWorkspaces = await this.prisma.workspaceUser.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    const workspaceIds = userWorkspaces.map((w) => w.workspaceId);


    const documents = await this.prisma.document.findMany({
      where: {
        OR: [{ workspaceId: { in: workspaceIds } }, { authorId: userId }]
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const total = await this.prisma.document.count({
      where: {
        OR: [{ workspaceId: { in: workspaceIds } }, { authorId: userId }]
      }
    });

    return {
      items: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        workspaceId: doc.workspaceId,
        authorId: doc.authorId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),

        workspace: {
          id: doc.workspace.id,
          name: doc.workspace.name
        }
      })),
      total,
      page: 1,
      limit
    };
  }
}