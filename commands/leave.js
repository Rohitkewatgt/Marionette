const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Leave the current voice channel and reset TTS."),

    async execute(interaction) {
        const result = await executeCommand("leave", {
            guild: interaction.guild,
            member: interaction.member
        });

        await interaction.reply(result.message);
    }
};