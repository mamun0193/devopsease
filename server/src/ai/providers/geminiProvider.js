import BaseProvider from './baseProvider.js';
import { GoogleGenAI } from '@google/genai';

export default class GeminiProvider extends BaseProvider {
    constructor() {
        super();
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        this.modelName = 'gemini-2.5-flash';
    }

    _formatMessages(messages) {
        // GenAI SDK expects { role: 'user' | 'model', parts: [{ text: string }] }
        // We also extract system messages to form systemInstruction
        let systemInstruction = '';
        const contents = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction += msg.content + '\n\n';
            } else {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        return { contents, systemInstruction: systemInstruction.trim() };
    }

    async generate(messages, options = {}) {
        try {
            const { contents, systemInstruction } = this._formatMessages(messages);
            const response = await this.ai.models.generateContent({
                model: this.modelName,
                contents,
                config: {
                    systemInstruction,
                    temperature: options.temperature || 0.3, // Prefer deterministic answers
                }
            });
            return response.text;
        } catch (error) {
            console.error('Gemini Provider Generate Error:', error);
            throw new Error('Failed to generate response from Gemini.');
        }
    }

    async *stream(messages, options = {}) {
        try {
            const { contents, systemInstruction } = this._formatMessages(messages);
            const responseStream = await this.ai.models.generateContentStream({
                model: this.modelName,
                contents,
                config: {
                    systemInstruction,
                    temperature: options.temperature || 0.3,
                }
            });

            for await (const chunk of responseStream) {
                if (chunk.text) {
                    yield chunk.text;
                }
            }
        } catch (error) {
            console.error('Gemini Provider Stream Error:', error);
            throw new Error('Failed to stream response from Gemini.');
        }
    }

    async countTokens(text) {
        try {
            const response = await this.ai.models.countTokens({
                model: this.modelName,
                contents: text
            });
            return response.totalTokens;
        } catch (error) {
            return 0; // Fallback
        }
    }

    supportsStreaming() { return true; }
    supportsVision() { return true; }
    supportsToolCalling() { return true; }
    supportsEmbeddings() { return true; }
}
