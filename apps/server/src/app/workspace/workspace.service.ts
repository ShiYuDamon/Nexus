import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddWorkspaceMemberDto, UpdateWorkspaceMemberDto, WorkspaceRole } from '@nexus-main/common';

@Injectable()export class
WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    const { name, description } = createWorkspaceDto;
    return this.prisma.workspace.create({
      data: {
        name,
        description,
        users: {
          create: {
            role: 'owner',
            user: {
              connect: { id: userId }
            }
          }
        }
      },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [workspaces, total] = await Promise.all([
    this.prisma.workspace.findMany({
      where: {
        users: {
          some: {
            user: {
              id: userId
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: {
            role: 'owner'
          },
          include: {
            user: true
          }
        }
      }
    }),
    this.prisma.workspace.count({
      where: {
        users: {
          some: {
            user: {
              id: userId
            }
          }
        }
      }
    })]
    );


    const items = workspaces.map((workspace) => {
      const owner = workspace.users[0]?.user;
      return {
        ...workspace,
        ownerId: owner?.id || '',
        users: undefined
      };
    });

    return {
      items,
      total,
      page,
      limit
    };
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }


    const isMember = workspace.users.some((member) => member.user.id === userId);

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this workspace');
    }


    const members = workspace.users.map((user) => ({
      id: user.id,
      userId: user.user.id,
      role: user.role as WorkspaceRole,
      user: {
        id: user.user.id,
        name: user.user.name || '',
        email: user.user.email
      }
    }));

    const owner = workspace.users.find((user) => user.role === 'owner');
    const ownerId = owner?.user.id || '';

    return {
      ...workspace,
      members,
      ownerId,
      users: undefined
    };
  }

  async update(id: string, userId: string, updateWorkspaceDto: UpdateWorkspaceDto) {

    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        users: {
          where: {
            user: {
              id: userId
            }
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }


    const userRole = workspace.users[0]?.role;
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('You do not have permission to update this workspace');
    }


    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto
    });
  }

  async remove(id: string, userId: string) {

    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        users: {
          where: {
            user: {
              id: userId
            },
            role: 'owner'
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }


    if (workspace.users.length === 0) {
      throw new ForbiddenException('Only the workspace owner can delete it');
    }


    return this.prisma.workspace.delete({
      where: { id }
    });
  }


  async addMember(workspaceId: string, userId: string, addMemberDto: AddWorkspaceMemberDto) {

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          where: {
            user: {
              id: userId
            }
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }


    const userRole = workspace.users[0]?.role;
    const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('You do not have permission to add members to this workspace');
    }


    const userToAdd = await this.prisma.user.findUnique({
      where: { email: addMemberDto.email }
    });

    if (!userToAdd) {
      throw new NotFoundException(`User with email ${addMemberDto.email} not found`);
    }


    const existingMember = await this.prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        user: {
          id: userToAdd.id
        }
      }
    });

    if (existingMember) {
      throw new ForbiddenException(`User ${addMemberDto.email} is already a member of this workspace`);
    }


    return this.prisma.workspaceUser.create({
      data: {
        workspace: { connect: { id: workspaceId } },
        user: { connect: { id: userToAdd.id } },
        role: addMemberDto.role.toLowerCase()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateMember(workspaceId: string, memberId: string, userId: string, updateMemberDto: UpdateWorkspaceMemberDto) {

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }


    const member = workspace.users.find((m) => m.id === memberId);
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found in workspace`);
    }


    const currentUser = workspace.users.find((m) => m.user.id === userId);
    const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('You do not have permission to update members in this workspace');
    }


    const owner = workspace.users.find((m) => m.role === 'owner');
    if (member.id === owner?.id) {
      throw new ForbiddenException('Cannot change the role of the workspace owner');
    }


    return this.prisma.workspaceUser.update({
      where: { id: memberId },
      data: { role: updateMemberDto.role.toLowerCase() }
    });
  }

  async removeMember(workspaceId: string, memberId: string, userId: string) {

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }


    const member = workspace.users.find((m) => m.id === memberId);
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found in workspace`);
    }


    const currentUser = workspace.users.find((m) => m.user.id === userId);
    const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('You do not have permission to remove members from this workspace');
    }


    const owner = workspace.users.find((m) => m.role === 'owner');
    if (member.id === owner?.id) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }


    return this.prisma.workspaceUser.delete({
      where: { id: memberId }
    });
  }
}