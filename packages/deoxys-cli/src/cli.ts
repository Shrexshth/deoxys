import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { DeoxysEngine } from './engine';

// Load environment variables (e.g., API keys for the LLM)
dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function animateBootSequence() {
    const frames = [
        `\x1b[35m
   ⢀⣠⣾⣿⣶⣄⡀
  ⣴⣿⣿⣿⣿⣿⣿⣿⣦
 ⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿
  ⠙⢿⣿⣿⣿⣿⣿⣿⡿⠋
     ⠙⢿⣿⣿⡿⠋
     \x1b[0m`,
        `\x1b[31m
      ⣠⣾⣿⣶⣄
     ⣴⣿⣿⣿⣿⣿⣦
    ⢿⣿⣿⣿⣿⣿⣿⣿⡿
     ⠙⢿⣿⣿⣿⡿⠋
        ⠙⠋
        \x1b[0m`,
        `\x1b[36m
        ⣠⣶⣄
       ⣴⣿⣿⣿⣦
      ⢿⣿⣿⣿⣿⣿⡿
       ⠙⢿⣿⡿⠋
        \x1b[0m`
    ];

    console.clear();
    for (let i = 0; i < 6; i++) {
        console.clear();
        console.log(frames[i % 3]);
        console.log(`\x1b[35m🧬 INITIATING PROJECT DEOXYS (Powered by TrueForge Core)\x1b[0m`);
        console.log(`\x1b[90mMutating neural pathways [${'#'.repeat(i)}${'.'.repeat(5 - i)}]\x1b[0m`);
        await sleep(300);
    }
    
    console.clear();
    console.log(`\x1b[31m
    ⣿⣿⣿⣿⣿⣿⣿⣿⣿
    ⣿⣿   DEOXYS   ⣿⣿
    ⣿⣿⣿⣿⣿⣿⣿⣿⣿
    \x1b[0m`);
    console.log(`\x1b[32m[SYSTEM ONLINE] TrueForge Core Lobotomized & Weaponized.\x1b[0m\n`);
}

async function startCLI() {
    await animateBootSequence();
    
    const engine = new DeoxysEngine();

    // Bind Engine Events to Terminal Output (Added :string types to fix TS errors)
    engine.on('log', (message: string) => console.log(`\x1b[36m%s\x1b[0m`, message)); // Cyan
    engine.on('success', (message: string) => console.log(`\x1b[32m%s\x1b[0m`, message)); // Green
    engine.on('error', (message: string) => console.log(`\x1b[31m%s\x1b[0m`, message)); // Red

    // Setup standard Input/Output
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[35mDeoxys ❯ \x1b[0m' // Magenta prompt
    });

    // Start the REPL
    rl.prompt();

    // Added :string type to fix TS error
    rl.on('line', async (line: string) => {
        const input = line.trim();
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log('\x1b[31mShutting down Deoxys...\x1b[0m');
            process.exit(0);
        }

        if (input) {
            await engine.executePrompt(input);
        }
        
        rl.prompt();
    }).on('close', () => {
        console.log('\n\x1b[31mShutting down Deoxys...\x1b[0m');
        process.exit(0);
    });
}

startCLI();