using Microsoft.Extensions.AI;
using OpenAI.RealtimeConversation;
using RealtimeFormApp.Support;
using System.Text;
using System.Text.Json;
using System.Text.Json.Schema;

namespace RealtimeFormApp;

public class RealtimeConversationManager<TModel>(string modelDescription, RealtimeConversationClient realtimeConversationClient, Stream micStream, Speaker speaker, Action<TModel> updateCallback, Action<string> addMessage) : IDisposable
{
    RealtimeConversationSession? session;
    string? prevModelJson;

    // Call back into the UI layer to update the data in the form
    AIFunction[] tools = [AIFunctionFactory.Create((TModel modelData) => updateCallback(modelData), "Save_ModelData")];

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        var jsonSchema = JsonSerializer.Serialize(
            JsonSerializerOptions.Default.GetJsonSchemaAsNode(typeof(TModel), new() { TreatNullObliviousAsNonNullable = true }));
        var sessionOptions = new ConversationSessionOptions()
        {
            Instructions = $"""
                You are helping to edit a JSON object that represents a {modelDescription}.
                This JSON object conforms to the following schema: {jsonSchema}

                IMPORTANT RULES:
                1. Listen to the user and collect information from them. Do not reply unless explicitly asked.
                2. When updating the JSON object, ALWAYS include ALL existing fields with their current values.
                3. Only change the specific fields mentioned by the user.
                4. NEVER send null or empty values for fields that already have data.
                5. For nested objects, include ALL properties even if only one changed.
                6. For lists, always include all existing items plus any new ones.
                7. After calling the save tool, just reply "OK".

                Example: If user says "set wallet to 200" and current FirstName is "John", 
                include both in the update: FirstName must still be "John", Wallet becomes 200.

                DO NOT send partial updates that omit existing data.
                """,
            Voice = ConversationVoice.Alloy,
            ContentModalities = ConversationContentModalities.Text,
            TurnDetectionOptions = ConversationTurnDetectionOptions.CreateServerVoiceActivityTurnDetectionOptions(detectionThreshold: 0.4f, silenceDuration: TimeSpan.FromMilliseconds(150)),
        };

        foreach (var tool in tools)
        {
            sessionOptions.Tools.Add(tool.ToConversationFunctionTool());
        }

        addMessage("Connecting...");
        session = await realtimeConversationClient.StartConversationSessionAsync();
        await session.ConfigureSessionAsync(sessionOptions);
        var outputStringBuilder = new StringBuilder();

        await foreach (ConversationUpdate update in session.ReceiveUpdatesAsync(cancellationToken))
        {
            switch (update)
            {
                case ConversationSessionStartedUpdate:
                    addMessage("Connected");
                    _ = Task.Run(async () => await session.SendInputAudioAsync(micStream, cancellationToken));
                    break;

                case ConversationInputSpeechStartedUpdate:
                    addMessage("Speech started");
                    await speaker.ClearPlaybackAsync(); // If the user interrupts, stop talking
                    break;

                case ConversationInputSpeechFinishedUpdate:
                    addMessage("Speech finished");
                    break;

                case ConversationItemStreamingPartDeltaUpdate outputDelta:
                    // Happens each time a chunk of output is received
                    await speaker.EnqueueAsync(outputDelta.AudioBytes?.ToArray());
                    outputStringBuilder.Append(outputDelta.Text ?? outputDelta.AudioTranscript);
                    break;

                case ConversationResponseFinishedUpdate responseFinished:
                    // Happens when a "response turn" is finished
                    addMessage(outputStringBuilder.ToString());
                    outputStringBuilder.Clear();
                    break;
            }

            await HandleToolCallsAsync(update, tools);
        }
    }

    public void Dispose()
    {
        session?.Dispose();
    }

    // Called by the UI when the user manually edits the form. This lets the AI know
    // the latest state in case it needs to make further updates.
    public async Task SetModelData(TModel modelData)
    {
        if (session is not null)
        {
            var newJson = JsonSerializer.Serialize(modelData);
            if (newJson != prevModelJson)
            {
                prevModelJson = newJson;
                await session.AddItemAsync(ConversationItem.CreateUserMessage([
                    $"CURRENT STATE: {newJson}",
                    "IMPORTANT: When saving updates, you MUST include ALL of these existing values.",
                    "Only change the fields the user specifically mentions.",
                    "Never omit or set to null any fields that have values."
                ]));
            }
        }
    }

    private async Task HandleToolCallsAsync(ConversationUpdate update, AIFunction[] tools)
    {
        switch (update)
        {
            case ConversationItemStreamingFinishedUpdate itemFinished:
                // If we need to call a tool to update the model, do so
                if (!string.IsNullOrEmpty(itemFinished.FunctionName))
                {
                    try
                    {
                        var output = await itemFinished.GetFunctionCallOutputAsync(tools);
                        if (output is not null)
                        {
                            await session!.AddItemAsync(output);
                        }
                    }
                    catch (JsonException ex)
                    {
                        // Log JSON errors and send feedback to AI
                        addMessage($"⚠️ JSON error: {ex.Message}");
                        var errorResponse = ConversationItem.CreateFunctionCallOutput(
                            itemFinished.FunctionCallId ?? "",
                            $"Error: Invalid JSON format. Please ensure the data matches the schema exactly. Error: {ex.Message}"
                        );
                        await session!.AddItemAsync(errorResponse);
                    }
                    catch (Exception ex)
                    {
                        // Log other errors
                        addMessage($"❌ Error: {ex.Message}");
                        var errorResponse = ConversationItem.CreateFunctionCallOutput(
                            itemFinished.FunctionCallId ?? "",
                            $"Error processing data: {ex.Message}"
                        );
                        await session!.AddItemAsync(errorResponse);
                    }
                }
                break;

            case ConversationResponseFinishedUpdate responseFinished:
                // If we added one or more function call results, instruct the model to respond to them
                if (responseFinished.CreatedItems.Any(item => !string.IsNullOrEmpty(item.FunctionName)))
                {
                    try
                    {
                        await session!.StartResponseAsync();
                    }
                    catch (Exception ex)
                    {
                        addMessage($"Error starting response: {ex.Message}");
                    }
                }
                break;
        }
    }
}
