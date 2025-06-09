# Serene Pub

Serene Pub is a modern, customizable chat application designed for immersive roleplay and creative conversations.

This app is heavily inspired by Silly Tavern, with the objective of being more intuitive, responsive and simple to configure.

Primary concerns Serene Pub aims to address:
  1. Reduce the number of nested menus and settings.
  2. Reduced visual clutter.
  3. Manage settings server-side to prevent configurations from changing because the user switched windows/devices.
  4. Make API calls & chat completion requests asyncronously server-side so they process regardless of window/device state.
  5. Use sockets for all data, the user will see the same information updated across all windows/devices.
  6. Have compatibility with the majority of Silly Tavern import/exports, i.e. Character Cards
  7. Overall be a well rounded app with a suite of features. Use SillyTavern if you want the most options, features and plugin-support.

## Project Status, Testing and Feedback

Serene Pub is currently early in **Alpha** and is a functional proof of concept. Expect bugs!

Do not download this project (yet) if you are looking for a mature, feature complete project.

If you are a developer, or can follow these setup instructions, then testing and feedback are greatly appreciated.

Everything is considered proof of concept and subject to change.

## Features

The following features are functional, mostly functional, in progress or pending.

### Functional

1. Manage sampling and context limits
    - Any setting can be individually disabled/enabled, great for relying on API defaults.
2. Manage roleplay/system prompt instructions

### Mostly Functional

1. Create, manage, import & export your characters
    - Import currently only supports [PNG Card Files](https://aicharactercards.com/).
    - Export is not yet implemented.
2. Create, manage, import & export your personas
     - Import and export are not yet implemented.
  
### In Progress (some functionality)

1. Connect to your favorite API
    - Only Ollama is currently supported
    - ChatML special tokens are currently hardcoded in prompt building
    - Still finalizing 
2. Manage context settings
    - Recommend using the default option with a ChatML compatible model.
    - Not all fields are enabled/supported yet.
    - The included templates and configuration are subject to change in the future, (currently using SillyTavern default options.)
3. Chats
    - Not implemented: Manually continue/trigger response, regenerate response, swipe next response, swipe initial message, hide message, edit/rename chat, streaming.
    - Implemented: Create & delete chat, send persona message, generate character response, edit and delete messages.

### Pending

1. Character/chat tags
2. Mobile responsive view, (only desktop is fully functional)
3. Lorebooks
4. Group chats
5. App/user settings
6. Home page first-time setup guide that tracks your current step

### Considered

1. Multi-user, user logins
2. Multi-user group chats
3. Chat summarizing
4. Chat/lore vectorization
5. User/per chat backgrounds
6. Day/night mode toggle and theme selection
7. Story narration
8. Screen reader support

## Software Stack

1. Sveltekit (Svelte 5)
2. Socket.io via [sveltekit-io](https://github.com/cedrictailly/sveltekit-io)
3. Tailwind, themes and components via [Skeleton UI](https://skeleton.dev)
4. ORM, sqlite, and migrations via [Drizzle ORM](https://orm.drizzle.team/)
5. [Bun](https://bun.sh/) for package management

## Screenshots

![image](https://github.com/user-attachments/assets/73be6dbd-08ca-4ebd-b754-35c2da7686c3)

![image](https://github.com/user-attachments/assets/40319283-93a1-4ce3-8412-3778ad3ce9a1)

![image](https://github.com/user-attachments/assets/4d4eb3ea-022c-4de6-a5d3-27701eb7e71e)

## Getting Started (Testing)

### Requirements

#### Ollama

Download & install from [here.](https://ollama.com/download)

Then install one or more models. You can find some [here.](https://ollama.com/search?q=roleplay) There's also Hugging Face.

#### Node

Download & install from [here.](https://nodejs.org/en)

#### Bun

Download & install from [here.](https://bun.sh/)

### Instructions

1. Download or clone this repository.
2. In terminal, navigate to the directory.
3. Run `bun i` to install the dependencies.
4. Run `bun run db:migrate` to generate the database.
5. Run `bun run dev` to start up the server
6. Navigate to `http://localhost:5173`.
7. In the top left bar, click on the connections button.
8. Create a new ollama connection, select your model and save (all settings, characters, etc have to be saved to take effect).
9. In the top right bar, click the characters button. Create or import a character card and save.
10. In the top right bar, click the personas button. Create your persona.
11. In the top right bar, click the chats button. Create a new chat by entering a name and clicking save.
12. In the chats sidebar, click your new chat.
13. Type in a message and click send to begin the conversation.

## Directories and files

By default the data will automatically be saved to the following directory, based on your operating system:

- **macOS:** `~/Library/Application Support/SerenePub`
- **Windows:** `%LOCALAPPDATA%\SerenePub`
- **Linux:** `~/.local/share/SerenePub`

The following files will be located inside:

- **Database:** `./data/main.db`
- **Character avatar:** `./data/users/[userId]/characters/[characterId]/avatar.png`
- **Persona avatar:** `./data/users/[userId]/personas/[personaId]/avatar.png`

Avatars are linked via the database. Manually placing an avatar in the directory will not work, it should be uploaded through the edit character form.

