import { InteractionHandler, InteractionHandlerTypes, PieceContext } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

export class SendHiButtonHandler extends InteractionHandler {
	public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'send-hi') return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.reply({
			content: 'Hello from a button interaction handler!',
			// Let's make it so only the person who pressed the button can see this message!
			ephemeral: true
		});
	}
}
