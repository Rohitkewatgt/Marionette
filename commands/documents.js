const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("documents")
        .setDescription("Show Marionette's Privacy Policy and Terms of Service."),

    async execute(interaction) {
        const result = await executeCommand("documents");

        await interaction.reply({
            content: result.message,
            ephemeral: true
        });
    }
};