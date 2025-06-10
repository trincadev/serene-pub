# Serene Pub

<!-- TOC -->
- [Project Status, Testing and Feedback](#project-status-testing-and-feedback)
- [Features](#features)
  - [Functional](#functional)
  - [Mostly Functional](#mostly-functional)
  - [In Progress (some functionality)](#in-progress-some-functionality)
  - [Pending Priorities](#pending-priorities)
  - [Considered](#considered)
- [Software Stack](#software-stack)
- [Screenshots](#screenshots)
- [Getting Started (Help Test Serene Pub!)](#getting-started-help-test-serene-pub)
  - [Requirements](#requirements)
    - [Ollama](#ollama)
    - [Node](#node)
    - [Bun](#bun)
  - [Instructions](#instructions)
- [Directories and files](#directories-and-files)
- [Feedback and contributing](#feedback-and-contributing)
  - [Feedback & Contact](#feedback--contact)
<!-- /TOC -->

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
3. Chats
   - Implemented:
      - create & delete chat
      - send persona message
      - automatically generate character response
      - edit and delete messages
      - streaming
      - regenerate last message
      - manually trigger a response
      - hide message
      - get live updates on token count and # of included message history
    - Not implemented:
      - Swipe next response
      - swipe example messages
      - edit/rename chat
      - include example messages in compiled prompt
5. Manage prompt instructions, i.e. role-play style
  
### In Progress (some functionality)

1. Connect to your favorite API
    - [see here for currently supported options](https://github.com/doolijb/serene-pub/issues/10)
2. Manage context settings
    - Only one default option is provided right now, but you can add your own.
    - No support for Instruct yet

### Pending Priorities

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
7. Story narration with seperate system instructions
8. Screen reader support

## Software Stack

1. Sveltekit (Svelte 5)
2. Socket.io via [sveltekit-io](https://github.com/cedrictailly/sveltekit-io)
3. Tailwind, themes and components via [Skeleton UI](https://skeleton.dev)
4. ORM, sqlite, and migrations via [Drizzle ORM](https://orm.drizzle.team/)
5. [Bun](https://bun.sh/) for package management

## Screenshots

1. Clean, intuitive chat interface, enter your text in the bottom field

![image](https://github.com/user-attachments/assets/aead8e09-00b5-42ec-983f-6e5f2005fddc)


3. Manage sampling in the left panel, character list in the right panel, monitor your token/prompt stats in the bottom
   
![image](https://github.com/user-attachments/assets/4be5e4ec-08e7-47c4-bf4d-b55abfeff184)


4. Manage your connections/models in the left panel, edit characters on the right, preview your text in the bottom
   
![image](https://github.com/user-attachments/assets/4a8b92a1-2e49-426c-b437-0ed3a45b4276)

5. Manage system prompt/roleplay instructions on the left panel, create a persona on the right, trigger a response on the bottom.
   
![image](https://github.com/user-attachments/assets/35a6b563-1c9c-4b81-847d-30060b268ffb)

## Getting Started (Help Test Serene Pub!)

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

## Feedback and contributing

### Feedback & Contact

Feel free to clone & contribute! Bug fixes are appreciated. If you want to add a brand new feature, please first propose your strategy for implementation before investing your time.

To provide feedback, or to reach out to me, you have any of the following options:
1. [Open up a new issue](https://github.com/doolijb/serene-pub/issues). Feedback, bug fixes or questions are welcome.
2. [Contact me on Reddit](https://reddit.com/u/doolijb)
3. Message me on discord, ID: `285999266088878080`

