import { watch, readFileSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as dotenv from 'dotenv';

// AI SDK Imports
import { generateText, tool as createTool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Load our API keys from the .env file (Gemini Key)
dotenv.config();

export class DeoxysEngine extends EventEmitter {
    private skillFilePath: string;
    private systemInstruction: string = '';
    private mcpClient!: Client;
    private isSandboxArmed: boolean = false;

    constructor() {
        super();
        this.skillFilePath = join(process.cwd(), 'SKILL.md');
        this.ensureSkillFileExists();
        this.loadSkills();
        this.initHotReloader();
        
        // Boot up Fort Knox asynchronously
        this.initFortKnox();
    }

    private ensureSkillFileExists() {
        if (!existsSync(this.skillFilePath)) {
            const defaultSkills = `# Deoxys Base Directives\n1. You are Deoxys, a terminal-native autonomous agent.\n2. Execute tasks safely.\n3. Always explain what you are doing before executing a command.`;
            writeFileSync(this.skillFilePath, defaultSkills, 'utf-8');
        }
    }

    private loadSkills() {
        try {
            this.systemInstruction = readFileSync(this.skillFilePath, 'utf-8');
            this.emit('log', `[Deoxys System] Skills loaded into core memory. (${this.systemInstruction.length} bytes)`);
        } catch (error: any) {
            this.emit('error', `Failed to load SKILL.md: ${error.message}`);
        }
    }

    private initHotReloader() {
        watch(this.skillFilePath, (eventType, filename) => {
            if (eventType === 'change') {
                this.emit('log', `\n[MUTATION DETECTED] File watcher triggered on ${filename || 'SKILL.md'}.`);
                this.loadSkills();
                this.emit('log', `[Deoxys System] Hot-reload complete. Agent neural pathways updated.\n`);
            }
        });
    }

    private async initFortKnox() {
        this.emit('log', `[Fort Knox] Establishing secure stdio link to Python Sandbox...`);
        
        try {
            const projectRoot = resolve(__dirname, '../../../');
            const serverPath = join(projectRoot, 'sandbox', 'server.py');
            
            const venvPython = join(projectRoot, 'venv', 'bin', 'python3');
            const pythonCommand = existsSync(venvPython) ? venvPython : 'python3';

            const transport = new StdioClientTransport({
                command: pythonCommand,
                args: [serverPath]
            });
            
            this.mcpClient = new Client(
                { name: 'DeoxysEngine', version: '1.0.0' }, 
                { capabilities: {} }
            );
            
            await this.mcpClient.connect(transport);
            this.isSandboxArmed = true;
            this.emit('success', `[Fort Knox] Python Sandbox connected! Docker execution armed.`);
        } catch (error: any) {
            this.emit('error', `[Fort Knox Crash] Failed to connect to Python server: ${error.message}`);
        }
    }

    public async executePrompt(userPrompt: string) {
        if (!this.isSandboxArmed) {
            this.emit('error', `[Agent] Cannot execute. Fort Knox sandbox is offline.`);
            return;
        }

        this.emit('log', `\n[Deoxys Neural Net] Synthesizing directive...`);
        
        try {
            // Vercel AI SDK execution with Gemini
            const { text } = await generateText({
                model: google('gemini-3.5-flash-lite'),
                system: this.systemInstruction, // Passes our SKILL.md rules!
                prompt: userPrompt,
                
                tools: {
                    run_local_bash: createTool({
                        description: 'Executes a bash command securely in a local Docker sandbox. Use this to read files, run scripts, or create folders. Wait for output before proceeding.',
                        parameters: z.object({
                            command: z.string().describe('The bash command to execute (e.g., ls -la, mkdir test)')
                        }),
                        execute: async (args: { command: string }) => {
                            const command = args.command;
                            this.emit('log', `[Agent Action] Executing via Fort Knox: ${command}`);
                            
                            try {
                                const result: any = await this.mcpClient.callTool({
                                    name: 'run_local_bash',
                                    arguments: { command }
                                });
                                
                                const output = result.content[0].text;
                                this.emit('log', `[Sandbox Output] ${output.substring(0, 150)}${output.length > 150 ? '...\n(truncated)' : ''}`);
                                return output;
                            } catch (error: any) {
                                this.emit('error', `[Tool Error] ${error.message}`);
                                return `Error: ${error.message}`;
                            }
                        }
                    } as any)
                }
            });

            // The final conversational response from Gemini after it finishes its tool work
            this.emit('success', `\n[Deoxys] ${text}\n`);
            
        } catch (error: any) {
            this.emit('error', `[AI Core Error] ${error.message}`);
        }
    }
}