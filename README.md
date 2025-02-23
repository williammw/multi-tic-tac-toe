# Multiplayer Tic-Tac-Toe with Custom Rules

A real-time multiplayer tic-tac-toe game where each player can have up to 3 marks on the board. When a player places their 4th mark, their oldest mark is removed.

## Features

- Real-time multiplayer gameplay using Socket.IO
- Custom rule: Maximum 3 marks per player
- Automatic removal of oldest mark when placing a 4th
- Win detection for traditional 3-in-a-row
- Player turn indicators
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. In a new terminal, start the development server:
```bash
npm run dev
```

4. Open two browser windows to play:
   - http://localhost:5173

## Game Rules

1. Players take turns placing their marks (X or O)
2. Each player can have a maximum of 3 marks on the board
3. When a player places their 4th mark, their oldest mark is removed
4. First player to get 3 in a row (horizontally, vertically, or diagonally) wins
5. If no player achieves 3 in a row and the board is full, the game is a draw

## Technologies Used

- React
- TypeScript
- Vite
- Socket.IO
- CSS3

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
