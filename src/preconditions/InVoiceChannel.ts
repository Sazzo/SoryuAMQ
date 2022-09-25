import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, GuildMember } from 'discord.js';

export class InVoiceChannelPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		return this.checkIfUserIsInVoiceChannel(interaction.member as GuildMember);
	}

	private checkIfUserIsInVoiceChannel(guildMember: GuildMember) {
		return guildMember.voice.channel && guildMember.voice.channel.type === 'GUILD_VOICE'
			? this.ok()
			: this.error({ message: 'You must be in a voice channel to create a match!' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		InVoiceChannel: never;
	}
}
