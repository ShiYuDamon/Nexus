import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@nexus-main/database';
import { RegisterDto } from '@nexus-main/common';

@Injectable()export class
UsersService {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(data: RegisterDto & {password: string;}) {
    return prisma.user.create({
      data
    });
  }

  async update(id: string, data: Partial<{name: string;avatar: string;lastLoginAt: Date;}>) {
    return prisma.user.update({
      where: { id },
      data
    });
  }
}