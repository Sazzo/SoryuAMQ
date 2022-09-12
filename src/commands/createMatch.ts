import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { VoiceChannel } from 'discord.js';
import { GameMatch } from '../lib/game/match';

@ApplyOptions<Command.Options>({
	description: 'Create a guess the anime match.',
	preconditions: ['InVoiceChannel']
})
export class CreateMatchCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) =>
					option
						.setName('difficulty')
						.setDescription('The difficulty of the match.')
						.setRequired(true)
						.addChoices({ name: 'Easy', value: 'EASY' }, { name: 'Medium', value: 'MEDIUM' }, { name: 'Hard', value: 'HARD' })
				)
				.addNumberOption((option) =>
					option.setName('rounds').setDescription('Number of rounds.').setMinValue(3).setMaxValue(15).setRequired(true)
				)
				.addNumberOption((option) =>
					option
						.setName('round_duration')
						.setDescription('Duration of each round (in seconds).')
						.setRequired(true)
						.setMinValue(5)
						.setMaxValue(60)
				)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const guildMember = interaction.guild?.members.cache.get(interaction.user.id)!;
		const voiceChannel = this.container.client.channels.cache.get(guildMember.voice.channelId!)! as VoiceChannel;

		const gameMatch = new GameMatch(interaction.channelId, voiceChannel, {
			matchRounds: interaction.options.getNumber('rounds')!,
			roundsDuration: interaction.options.getNumber('round_duration')!,
			difficulty: interaction.options.getString('difficulty')!
		});

		await interaction.reply({
			content: `${interaction.options.getString('difficulty')} ${interaction.options.getNumber('rounds')} ${interaction.options.getNumber(
				'round_duration'
			)} - user: ${interaction.member?.user.id}`
		});
		await gameMatch.startMatch();
	}
}
