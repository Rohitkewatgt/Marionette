const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Join your current voice channel."),

    async execute(interaction) {
        const result = await executeCommand("join", {
            guild: interaction.guild,
            member: interaction.member
        });

        await interaction.reply(result.message);
    }
};