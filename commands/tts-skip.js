const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tts-skip")
        .setDescription("Skip the message currently being spoken by Marionette."),

    async execute(interaction) {
        const result = await executeCommand("skip", {
            guild: interaction.guild,
            member: interaction.member
        });

        await interaction.reply(result.message);
    }
};