import { MatchState } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import Anilist from 'anilist-node';
import { AutocompleteInteraction, Formatters } from 'discord.js';
import { truncate } from '../lib/utils/utils';

@ApplyOptions<Command.Options>({
	description: 'Send a answer to an ongoing guess the anime match.',
	preconditions: ['InVoiceChannel']
})
export class SendAnswerCommand extends Command {
	private readonly anilist = new Anilist();

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) => option.setName('answer').setDescription('The answer (duh).').setRequired(true).setAutocomplete(true))
		);
	}

	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const runningMatch = await this.container.prisma.match.findFirst({
			where: {
				channelId: interaction.channelId,
				serverId: interaction.guildId!,
				state: MatchState.PLAYING
			},
			include: {
				players: true
			}
		});
		if (!runningMatch) return interaction.reply({ content: 'No match is currently running in this channel.', ephemeral: true });

		// TODO: Handle answers that are not an AL ID/integer.
		const userAnswer = parseInt(interaction.options.getString('answer')!);

		if (userAnswer === runningMatch.lastRoundAnswer) {
			const userMatchRecord = runningMatch.players.find((player) => player.playerId === interaction.user.id);

			// Prisma doesn't let me to "upsert" using a "where" filter with non-unique fields. So I had to do this.
			if (!userMatchRecord) {
				await this.container.prisma.playerMatchRecord.create({
					data: {
						player: {
							connectOrCreate: {
								where: { id: interaction.user.id },
								create: { id: interaction.user.id }
							}
						},
						match: {
							connect: {
								id: runningMatch.id
							}
						},
						score: 1
					}
				});
			} else {
				await this.container.prisma.playerMatchRecord.update({
					where: {
						id: userMatchRecord.id
					},
					data: {
						score: {
							increment: 1
						}
					}
				});
			}

			await interaction.reply({
				content: ':tada: Congrats! You guessed the right answer!',
				ephemeral: true
			});

			const userMention = Formatters.userMention(interaction.user.id);
			return interaction.channel?.send(`<a:bongo_cat:772152200851226684> __${userMention}__ got the answer right! `);
		} else {
			return interaction.reply({
				content: ":sob: That's not the right answer. Try again!",
				ephemeral: true
			});
		}
	}

	public async autocompleteRun(interaction: AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);
		if (focusedOption.name !== 'answer') return;
		if (!focusedOption.value) return interaction.respond([]);

		/* const malSearchResult = await fetch<JikanAnimeResource>(
			`https://api.jikan.moe/v4/anime?q=${focusedOption.value}&limit=10`,
			FetchResultTypes.JSON
		); */
		const anilistSearchResult = await this.anilist.searchEntry.anime(focusedOption.value, {}, 1, 10);

		return interaction.respond(
			anilistSearchResult.media.map((anime) => {
				const animeTitle = anime.title.english ? truncate(anime.title.english, 80) : truncate(anime.title.romaji, 80);

				return {
					name: animeTitle,
					value: anime.id.toString()
				};
			})
		);
	}
}
