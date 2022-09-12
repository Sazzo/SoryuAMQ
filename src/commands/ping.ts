import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Message, MessageActionRow, MessageButton } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'ping pong'
})
export class PingCommand extends Command {
	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Register slash command
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description
		});
	}

	// slash command
	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const msg = await interaction.reply({
			content: 'Ping?',
			components: [new MessageActionRow().addComponents(new MessageButton().setLabel('Send Hi').setCustomId('send-hi').setStyle('PRIMARY'))],
			fetchReply: true
		});
		const createdTime = msg instanceof Message ? msg.createdTimestamp : Date.parse(msg.timestamp);

		const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
			createdTime - interaction.createdTimestamp
		}ms.`;

		return await interaction.editReply({
			content: content
		});
	}
}
