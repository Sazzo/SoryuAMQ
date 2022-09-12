export interface JikanAnimeResource {
	data: [
		{
			mal_id: number;
			title: string;
			title_english: string;
			images: {
				jpg: {
					large_image_url: string;
				};
			};
		}
	];
}
