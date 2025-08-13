import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@nexus-main/database';

export interface CreateCommentDto {
  content: string;
  documentId: string;
  blockId?: string;
  textPosition?: number;
  textLength?: number;
  selectedText?: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  content?: string;
  isResolved?: boolean;
}

@Injectable()export class
CommentsService {



  async createComment(data: CreateCommentDto, userId: string) {
    const { documentId, parentId, ...commentData } = data;


    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }


    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }

      if (parentComment.documentId !== documentId) {
        throw new ForbiddenException('不能回复其他文档的评论');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        ...commentData,
        documentId,
        authorId: userId,
        parentId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return comment;
  }




  async getDocumentComments(documentId: string, includeResolved = false) {
    const whereClause: any = {
      documentId,
      isDeleted: false,
      parentId: null,
      blockId: null
    };

    if (!includeResolved) {
      whereClause.isResolved = false;
    }


    const repliesWhereClause: any = { isDeleted: false };
    if (!includeResolved) {
      repliesWhereClause.isResolved = false;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          where: repliesWhereClause,
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return comments;
  }




  async getBlockComments(documentId: string, blockId: string, includeResolved: boolean = true) {
    const whereClause: any = {
      documentId,
      blockId,
      isDeleted: false,
      parentId: null
    };

    if (!includeResolved) {
      whereClause.isResolved = false;
    }


    const repliesWhereClause: any = { isDeleted: false };
    if (!includeResolved) {
      repliesWhereClause.isResolved = false;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          where: repliesWhereClause,
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return comments;
  }




  async getAllBlockComments(documentId: string, includeResolved: boolean = false) {
    const whereClause: any = {
      documentId,
      isDeleted: false,
      blockId: { not: null },
      parentId: null
    };

    if (!includeResolved) {
      whereClause.isResolved = false;
    }


    const repliesWhereClause: any = { isDeleted: false };
    if (!includeResolved) {
      repliesWhereClause.isResolved = false;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          where: repliesWhereClause,
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return comments;
  }




  async getInlineComments(documentId: string, startPosition?: number, endPosition?: number) {
    const whereClause: any = {
      documentId,
      isDeleted: false,
      textPosition: { not: null },
      parentId: null
    };

    if (startPosition !== undefined && endPosition !== undefined) {
      whereClause.textPosition = {
        gte: startPosition,
        lte: endPosition
      };
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          where: { isDeleted: false },
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { textPosition: 'asc' }
    });

    return comments;
  }




  async updateComment(commentId: string, data: UpdateCommentDto, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('只能修改自己的评论');
    }

    if (comment.isDeleted) {
      throw new ForbiddenException('不能修改已删除的评论');
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    return updatedComment;
  }




  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('只能删除自己的评论');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

    return { success: true };
  }




  async toggleCommentResolution(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved: !comment.isResolved,
        updatedAt: new Date()
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    return updatedComment;
  }




  async getVersionCommentCount(versionId: string) {
    const count = await prisma.comment.count({
      where: {
        versionId,
        isDeleted: false
      }
    });

    return { count };
  }




  async getVersionComments(versionId: string, includeResolved = false) {
    const whereClause: any = {
      versionId,
      isDeleted: false,
      parentId: null
    };

    if (!includeResolved) {
      whereClause.isResolved = false;
    }


    const repliesWhereClause: any = { isDeleted: false };
    if (!includeResolved) {
      repliesWhereClause.isResolved = false;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        replies: {
          where: repliesWhereClause,
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return comments;
  }




  async getDocumentCommentHistory(documentId: string, includeResolved = false) {
    const whereClause: any = {
      documentId,
      isDeleted: false
    };

    if (!includeResolved) {
      whereClause.isResolved = false;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        version: {
          select: {
            id: true,
            versionNumber: true,
            title: true,
            changeType: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });


    return comments.map((comment) => ({
      ...comment,
      versionNumber: comment.version?.versionNumber,
      versionTitle: comment.version?.title
    }));
  }




  async createVersionComment(data: any, userId: string) {
    const { documentId, versionId, parentId, ...commentData } = data;


    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }


    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    if (version.documentId !== documentId) {
      throw new ForbiddenException('版本不属于指定文档');
    }


    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }

      if (parentComment.documentId !== documentId) {
        throw new ForbiddenException('不能回复其他文档的评论');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        ...commentData,
        documentId,
        versionId,
        authorId: userId,
        parentId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        version: {
          select: {
            id: true,
            versionNumber: true,
            title: true
          }
        }
      }
    });

    return comment;
  }




  async getCommentStats(documentId: string) {
    const [totalComments, unresolvedComments, resolvedComments] = await Promise.all([
    prisma.comment.count({
      where: { documentId, isDeleted: false }
    }),
    prisma.comment.count({
      where: { documentId, isDeleted: false, isResolved: false }
    }),
    prisma.comment.count({
      where: { documentId, isDeleted: false, isResolved: true }
    })]
    );

    return {
      totalComments,
      unresolvedComments,
      resolvedComments
    };
  }




  async getBlockCommentCounts(documentId: string, includeResolved: boolean = true) {
    const whereClause: any = {
      documentId,
      isDeleted: false,
      blockId: { not: null }
    };


    if (!includeResolved) {
      whereClause.isResolved = false;
    }

    const blockCounts = await prisma.comment.groupBy({
      by: ['blockId'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    return blockCounts.map((item) => ({
      blockId: item.blockId,
      count: item._count.id
    }));
  }
}