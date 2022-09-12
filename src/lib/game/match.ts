import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from '@discordjs/voice';
import { MatchDifficulty, MatchState } from '@prisma/client';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { container } from '@sapphire/framework';
import { Formatters, TextChannel, VoiceChannel } from 'discord.js';
import { Readable } from 'stream';

import { Themes, ThemesPoolEntry } from './themes';

export interface GameMatchOptions {
	matchRounds: number;
	roundsDuration: number;
	difficulty: string;
}

export class GameMatch {
	public currentMatchRound: number = 1;

	constructor(public matchChannelId: string, public userVoiceChannel: VoiceChannel, public gameOptions: GameMatchOptions) {
		this.matchChannelId = matchChannelId;
		this.userVoiceChannel = userVoiceChannel;
		this.gameOptions = gameOptions;
	}

	public async startMatch() {
		const matchChannel = container.client.channels.cache.get(this.matchChannelId) as TextChannel;

		// Small trick to make typescript happy about the enum.
		const difficulty = this.gameOptions.difficulty as keyof typeof MatchDifficulty;

		matchChannel.send(`Populating anime themes pool for the match...`);

		const matchThemes = new Themes(difficulty, this.gameOptions.matchRounds);
		const matchThemesPool = await matchThemes.populateThemesPoolByDifficulty();
		if (!matchThemesPool) throw new Error('Could not populate themes pool.');

		console.log(matchThemesPool);

		const match = await container.prisma.match.create({
			data: {
				difficulty,
				channelId: this.matchChannelId,
				serverId: this.userVoiceChannel.guildId,
				roundsDuration: this.gameOptions.roundsDuration,
				rounds: this.gameOptions.matchRounds
			}
		});

		matchChannel.send(`Populated anime themes pool for match **${match.id}**...`);

		while (this.gameOptions.matchRounds >= this.currentMatchRound) {
			const roundThemeEntry = matchThemesPool.get(this.currentMatchRound);
			if (!roundThemeEntry) throw new Error(`No theme found for round ${this.currentMatchRound}`);

			await this.startRound(match.id, matchChannel, roundThemeEntry);
			console.log(this.currentMatchRound);
		}
	}

	private async startRound(matchId: string, matchChannel: TextChannel, themesPoolEntry: ThemesPoolEntry) {
		await matchChannel.send(`Starting round **${this.currentMatchRound}** of **${this.gameOptions.matchRounds}**`);

		await container.prisma.match.update({
			where: { id: matchId },
			data: {
				lastRoundAnswer: themesPoolEntry.id
			}
		});
		this.currentMatchRound++;

		const voiceConnection = joinVoiceChannel({
			channelId: this.userVoiceChannel.id,
			guildId: this.userVoiceChannel.guild.id,
			adapterCreator: this.userVoiceChannel.guild.voiceAdapterCreator
		});
		await this.playThemeOnVoiceChannel(voiceConnection, themesPoolEntry.themeAudioUrl);

		await matchChannel.send(
			`:drum: The round ended! And the answer was...**${themesPoolEntry.title}** (AL ID: ${themesPoolEntry.id} | MAL ID: ${themesPoolEntry.malId})\n${themesPoolEntry.coverImage}`
		);

		if (this.currentMatchRound > this.gameOptions.matchRounds) {
			const matchWinner = await this.getMatchWinner(matchId);

			await container.prisma.match.update({
				where: { id: matchId },
				data: { state: MatchState.FINISHED }
			});

			voiceConnection.disconnect();
			voiceConnection.destroy();

			if (matchWinner) {
				const matchWinnerMention = Formatters.userMention(matchWinner.playerId);
				await matchChannel.send(
					`<a:Yay:838419253655765052> The match is over! And the winner is...__${matchWinnerMention}__! (score: ${matchWinner.score})\nThanks for playing! You can start another match with </creatematch:1013228111275511848>`
				);
			} else {
				await matchChannel.send(
					`<a:Yay:838419253655765052> The match is over! Sadly, I couldn't find a winner.\nThanks for playing! You can start another match with </creatematch:1013228111275511848>`
				);
			}
		}
	}

	private async getMatchWinner(matchId: string) {
		const matchWinner = await container.prisma.playerMatchRecord.findFirst({
			where: {
				matchId
			},
			orderBy: {
				score: 'desc'
			}
		});

		return matchWinner;
	}

	private playThemeOnVoiceChannel(connection: VoiceConnection, themeAudioUrl: string) {
		return new Promise<void>(async (resolve) => {
			const player = createAudioPlayer();
			player.on('error', (error) => console.error(error));
			connection.on('error', (error) => console.error(error));

			const playerSubscription = connection.subscribe(player)!;

			const themeAudioBuffer = await fetch(themeAudioUrl, FetchResultTypes.Buffer);
			const themeAudioResource = createAudioResource(Readable.from(themeAudioBuffer));
			player.play(themeAudioResource);

			setTimeout(() => {
				player.stop();
				playerSubscription.unsubscribe();

				resolve();
			}, this.gameOptions.roundsDuration * 1000);
		});
	}
}
