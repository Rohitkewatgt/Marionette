const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show Marionette's commands and how they work."),

    async execute(interaction) {
        const result = await executeCommand("help");

        await interaction.reply({
            content: result.message,
            ephemeral: true
        });
    }
};