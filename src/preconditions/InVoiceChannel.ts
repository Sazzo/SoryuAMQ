import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, Guild } from 'discord.js';

export class InVoiceChannelPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		return this.checkIfUserIsInVoiceChannel(interaction.guild!, interaction.user.id);
	}

	private checkIfUserIsInVoiceChannel(guild: Guild, userId: string) {
		const guildMember = guild.members.cache.get(userId)!;
		return guildMember.voice.channel ? this.ok() : this.error({ message: 'You must be in a voice channel to create a match!' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		InVoiceChannel: never;
	}
}
