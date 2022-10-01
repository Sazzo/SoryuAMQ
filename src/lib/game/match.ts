import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from '@discordjs/voice';
import { MatchDifficulty, MatchState } from '@prisma/client';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { container } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { Formatters, TextChannel, VoiceChannel } from 'discord.js';
import { Readable } from 'stream';
import { setTimeout } from 'timers/promises';

import { Themes, ThemesPoolEntry } from './themes';

export interface GameMatchOptions {
	matchRounds: number;
	roundsDuration: number;
	difficulty: string;
}

export class GameMatch {
	public currentMatchRound: number = 1;

	constructor(public matchChannel: TextChannel, public userVoiceChannel: VoiceChannel, public gameOptions: GameMatchOptions) {}

	public async startMatch() {
		// Small trick to make typescript happy about the enum.
		const difficulty = this.gameOptions.difficulty as keyof typeof MatchDifficulty;

		this.matchChannel.send(`Populating anime themes pool for the match...`);

		const matchThemes = new Themes(difficulty, this.gameOptions.matchRounds);
		const matchThemesPool = await matchThemes.populateThemesPoolByDifficulty();
		if (!matchThemesPool) throw new Error('Could not populate themes pool.');

		console.log(matchThemesPool);

		const match = await container.prisma.match.create({
			data: {
				difficulty,
				channelId: this.matchChannel.id,
				serverId: this.userVoiceChannel.guildId,
				roundsDuration: this.gameOptions.roundsDuration,
				rounds: this.gameOptions.matchRounds
			}
		});

		this.matchChannel.send(`Populated anime themes pool for match **${match.id}**...`);

		while (this.gameOptions.matchRounds >= this.currentMatchRound) {
			const roundThemeEntry = matchThemesPool[this.currentMatchRound - 1];
			if (!roundThemeEntry) throw new Error(`No theme found for round ${this.currentMatchRound}`);

			await this.startRound(match.id, roundThemeEntry);
			console.log(this.currentMatchRound);
		}
	}

	private async startRound(matchId: string, themesPoolEntry: ThemesPoolEntry) {
		await this.matchChannel.send(`Starting round **${this.currentMatchRound}** of **${this.gameOptions.matchRounds}**`);

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

		await this.matchChannel.send(
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
				await this.matchChannel.send(
					`<a:Yay:838419253655765052> The match is over! And the winner is...__${matchWinnerMention}__! (score: ${matchWinner.score})\nThanks for playing! You can start another match with </creatematch:1013228111275511848>`
				);
			} else {
				await this.matchChannel.send(
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

	private async playThemeOnVoiceChannel(connection: VoiceConnection, themeAudioUrl: string) {
		const player = createAudioPlayer();
		player.on('error', (error) => console.error(error));
		connection.on('error', (error) => console.error(error));

		const playerSubscription = connection.subscribe(player)!;

		const themeAudioBuffer = await fetch(themeAudioUrl, FetchResultTypes.Buffer);
		const themeAudioResource = createAudioResource(Readable.from(themeAudioBuffer));
		player.play(themeAudioResource);
    
    		await setTimeout(this.gameOptions.roundsDuration * Time.Second);
		player.stop();
		playerSubscription.unsubscribe();
	}
}
