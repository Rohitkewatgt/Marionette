const { SlashCommandBuilder } = require("discord.js");
const { executeCommand } = require("../systems/commandHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tts-engine")
        .setDescription("Change Marionette's TTS engine.")
        .addStringOption(option =>
            option
                .setName("engine")
                .setDescription("Select the TTS engine.")
                .setRequired(true)
                .addChoices(
                    {
                        name: "Fish Audio",
                        value: "fish"
                    },
                    {
                        name: "Piper",
                        value: "piper"
                    }
                )
        ),

    async execute(interaction) {
        const engine = interaction.options.getString("engine");

        const result = await executeCommand("engine", {
            guild: interaction.guild,
            member: interaction.member,
            engine
        });

        await interaction.reply(result.message);
    }
};