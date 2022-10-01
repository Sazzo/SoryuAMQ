import { container, LogLevel, SapphireClient } from '@sapphire/framework';

export class SoryuClient extends SapphireClient {
	public constructor() {
		super({
			logger: {
				level: LogLevel.Debug
			},
			shards: 'auto',
			intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_VOICE_STATES']
		});
	}

	public override async login(token?: string) {
		await container.prisma.$connect();

		return super.login(token);
	}

	public override async destroy() {
		await container.prisma.$disconnect();

		return super.destroy();
	}
}
