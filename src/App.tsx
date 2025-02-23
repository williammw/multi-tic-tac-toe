import Board from './components/Board'
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>Multiplayer Tic-Tac-Toe</h1>
      <p>Each player can place up to 3 marks. When placing a 4th mark, the oldest one is removed.</p>
      <Board />
    </div>
  )
}

export default App
