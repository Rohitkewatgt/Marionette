const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tts-clear")
        .setDescription("Stop the current TTS and clear the entire queue."),

    async execute(interaction) {
        const result = await executeCommand("clear", {
            guild: interaction.guild,
            member: interaction.member
        });

        await interaction.reply(result.message);
    }
};