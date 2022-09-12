import { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';

const prisma = new PrismaClient();
container.prisma = prisma;

declare module '@sapphire/pieces' {
	interface Container {
		prisma: PrismaClient;
	}
}
