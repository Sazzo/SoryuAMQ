import { container, LogLevel, SapphireClient } from '@sapphire/framework';

export class SoryuClient extends SapphireClient {
	public constructor() {
		super({
			logger: {
				level: LogLevel.Debug
			},
			shards: 'auto',
			intents: [
				'GUILDS',
				'GUILD_MEMBERS',
				'GUILD_BANS',
				'GUILD_EMOJIS_AND_STICKERS',
				'GUILD_VOICE_STATES',
				'GUILD_MESSAGES',
				'GUILD_MESSAGE_REACTIONS',
				'DIRECT_MESSAGES',
				'DIRECT_MESSAGE_REACTIONS'
			],
			partials: ['CHANNEL'],
			loadMessageCommandListeners: true
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
