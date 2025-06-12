# Serene Pub

<!-- TOC -->
- [Project Status](#project-status)
- [Screenshots](#screenshots)
- [Features](#features)
  - [Functional](#functional)
  - [Mostly Functional](#mostly-functional)
  - [In Progress](#in-progress)
  - [Pending Priorities](#pending-priorities)
  - [Considered](#considered)
- [Software Stack](#software-stack)
- [Getting Started (Download & Play!)](#getting-started-download--play)
- [Getting Started (Source Code)](#getting-started-source-code)
  - [Requirements](#requirements)
  - [Instructions](#instructions)
- [Directories and Files](#directories-and-files)
- [Feedback and Contributing](#feedback-and-contributing)
  - [Feedback & Contact](#feedback--contact)
<!-- /TOC -->

Serene Pub is a modern, customizable chat application designed for immersive roleplay and creative conversations. Inspired by Silly Tavern, it aims to be more intuitive, responsive, and simple to configure.

Primary concerns Serene Pub aims to address:
  1. Reduce the number of nested menus and settings.
  2. Reduced visual clutter.
  3. Manage settings server-side to prevent configurations from changing because the user switched windows/devices.
  4. Make API calls & chat completion requests asyncronously server-side so they process regardless of window/device state.
  5. Use sockets for all data, the user will see the same information updated across all windows/devices.
  6. Have compatibility with the majority of Silly Tavern import/exports, i.e. Character Cards
  7. Overall be a well rounded app with a suite of features. Use SillyTavern if you want the most options, features and plugin-support.

## Screenshots

1. Clean, intuitive chat interface

   <img src="https://github.com/user-attachments/assets/aead8e09-00b5-42ec-983f-6e5f2005fddc" alt="chat" width="700"/>
   
2. Sampling/character list/token stats

   <img src="https://github.com/user-attachments/assets/4be5e4ec-08e7-47c4-bf4d-b55abfeff184" alt="sampling" width="700"/>

3. Connections/models/character editing

   <img src="https://github.com/user-attachments/assets/4a8b92a1-2e49-426c-b437-0ed3a45b4276" alt="connections" width="700"/>

4. System prompt/persona/response

   <img src="https://github.com/user-attachments/assets/35a6b563-1c9c-4b81-847d-30060b268ffb" alt="persona" width="700"/>

5. Mobile chat view

   <img src="https://github.com/user-attachments/assets/60a89d4d-f0ae-4761-b51b-385feddcddfe" alt="mobile-chat" width="400"/>

6. Mobile characters view

   <img src="https://github.com/user-attachments/assets/b28d36d2-9d2b-4c15-b9ff-c9e3c2e84c5b" alt="mobile-characters" width="400"/>

## Project Status

**Alpha:** Serene Pub is in early development. Expect bugs and breaking changes. If you are a developer or comfortable with manual setup, your testing and feedback are appreciated!

## Features

### Functional
- Manage sampling and context limits (settings can be individually enabled/disabled)
- Manage roleplay/system prompt instructions
- Mobile responsive view

### Mostly Functional
- Create, manage, import & export characters (Image Card Files supported; JSON not yet)
- Create, manage, import & export personas (import/export not yet implemented)
- Chats: create/delete, send persona message, auto character response, edit/delete messages, streaming, regenerate, manual response, hide message, live token/history stats

### In Progress
- Connect to your favorite API ([see supported options](https://github.com/doolijb/serene-pub/issues/10))
- Manage context settings (add your own, only one default provided)
- Instruct support not yet available

### Pending Priorities
- Character/chat tags
- Full mobile support (desktop is fully functional)
- Lorebooks
- Group chats
- App/user settings
- Home page setup guide

### Considered
- Multi-user logins & group chats
- Chat summarizing
- Chat/lore vectorization
- User/chat backgrounds
- Day/night mode & themes
- Story narration/system instructions
- Screen reader support

### Software Stack
- SvelteKit (Svelte 5)
- Socket.io via [sveltekit-io](https://github.com/cedrictailly/sveltekit-io)
- Tailwind, themes, and components via [Skeleton UI](https://skeleton.dev)
- ORM, SQLite, and migrations via [Drizzle ORM](https://orm.drizzle.team/)
- [Bun](https://bun.sh/) for package management


## Getting Started (Download & Play!)

1. Download the latest release for your operating system [here.](https://github.com/doolijb/serene-pub/releases)
2. Extract the archive where every you desire, there's nothing to install.
3. Read the instructions to launch Serene Pub:
  - Linux instructions: [here](./instructions/INSTRUCTIONS-linux.txt)
  - MacOS instructions: [here](./instructions/INSTRUCTIONS-macos.txt)
  - Windows instructions: [here](./instructions/INSTRUCTIONS-windows.txt)
4. Once launched, the node runtime will download automatically and start Serene Pub.
5. Access SerenePub on your host machine from http://localhost:3000 or https://0.0.0.0:/3000
6. You should be able to access Serene Pub from other devices on your local network as well.

## Getting Started (Source Code)

### Requirements
- [Ollama](https://ollama.com/download) (install models from [here](https://ollama.com/search?q=roleplay) or Hugging Face)
- [Node.js](https://nodejs.org/en)
- [Bun](https://bun.sh/)

### Instructions
1. Download or clone this repository.
2. Open a terminal and navigate to the directory.
3. Run `bun i` to install dependencies.
4. Run `bun run db:migrate` to generate the database.
5. Run `bun run dev` to start the server.
6. Open `http://localhost:5173` in your browser.
7. Use the UI to set up connections, characters, personas, and chats.

## Directories and Files

Data is saved automatically to the following directory, based on your OS:
- **macOS:** `~/Library/Application Support/SerenePub`
- **Windows:** `%LOCALAPPDATA%\SerenePub`
- **Linux:** `~/.local/share/SerenePub`

Key files:
- **Database:** `./data/main.db`
- **Character avatar:** `./data/users/[userId]/characters/[characterId]/avatar.png`
- **Persona avatar:** `./data/users/[userId]/personas/[personaId]/avatar.png`

Avatars must be uploaded through the app; manual placement will not work.

## Feedback and Contributing

Feel free to clone & contribute! Bug fixes are appreciated. For new features, please propose your strategy before starting work.

### Feedback & Contact
- [Open an issue](https://github.com/doolijb/serene-pub/issues) for feedback, bugs, or questions
- [Contact on Reddit](https://reddit.com/u/doolijb)
- Discord: `285999266088878080`

