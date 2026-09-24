const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tts-status")
        .setDescription("Show Marionette's current TTS status."),

    async execute(interaction) {
        const result = await executeCommand("status", {
            guild: interaction.guild,
            member: interaction.member
        });

        await interaction.reply(result.message);
    }
};