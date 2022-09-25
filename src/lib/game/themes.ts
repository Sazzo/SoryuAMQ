import { MatchDifficulty } from '@prisma/client';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import Anilist from 'anilist-node';
import { Collection } from 'discord.js';
import type { AnimeThemesAnimeResource } from '../types/AnimeThemes';
import { pickNumberBetween, pickRandom } from '../utils/utils';

export interface ThemesPoolEntry {
	id: number;
	malId: number;
	title: string;
	coverColor: string;
	coverImage: string;
	themeAudioUrl: string;
}

export class Themes {
	private anilist = new Anilist();
	private matchThemesPool: ThemesPoolEntry[] = [];

	constructor(private difficulty: MatchDifficulty, private matchRounds: number) {
		this.difficulty = difficulty;
	}

	public async populateThemesPoolByDifficulty() {
		switch (this.difficulty) {
			case MatchDifficulty.EASY: {
				while (this.matchThemesPool.length < this.matchRounds) {
					const page = pickNumberBetween(1, 4);
					const popularAnimes = await this.anilist.searchEntry.anime(
						undefined,
						{
							sort: ['POPULARITY_DESC']
						},
						page
					);
					const randomPopularAnime = pickRandom(popularAnimes.media);

					const animeThemesAnime = await fetch<AnimeThemesAnimeResource>(
						`https://api.animethemes.moe/anime?include=animethemes.animethemeentries.videos.audio&filter[has]=resources&filter[site]=Anilist&filter[external_id]=${randomPopularAnime.id}`,
						FetchResultTypes.JSON
					);
					// Jump to next iteration if no theme for the anime was found.
					if (!animeThemesAnime.anime.length) continue;
					console.log(`AL ID: ${randomPopularAnime.id} - yay! found themes`);

					const selectedAnimeData = await this.anilist.media.anime(randomPopularAnime.id);

					const randomThemeTypeEntry = pickRandom(animeThemesAnime.anime[0].animethemes);
					const themeAudioUrl = randomThemeTypeEntry.animethemeentries[0].videos[0].audio.link;

					// Let's avoid adding duplicates themes to the pool.
					const isThemeAlreadyOnPool = this.matchThemesPool.find((poolEntry) => poolEntry.themeAudioUrl === themeAudioUrl);
					if (isThemeAlreadyOnPool) continue;
					console.log(`${themeAudioUrl} - not on pool`);

					this.matchThemesPool.push({
						id: selectedAnimeData.id,
						malId: selectedAnimeData.idMal,
						title: selectedAnimeData.title.english,
						coverColor: selectedAnimeData.coverImage.color,
						coverImage: selectedAnimeData.coverImage.large,
						themeAudioUrl: themeAudioUrl
					});
				}

				return this.matchThemesPool;
			}
			default: {
				return null;
			}
		}
	}
}
