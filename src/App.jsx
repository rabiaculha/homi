
import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'

import './App.css'

function App() {

  // ORTAK GÖREV LİSTESİ
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: 'Salon temizliği',
      person: 'Rabia',
      time: '10:00',
      done: false
    },
    {
      id: 2,
      name: 'Bulaşıkları yıka',
      person: 'Anne',
      time: '12:00',
      done: true
    },
    {
      id: 3,
      name: 'Market alışverişi',
      person: 'Rabia',
      time: '17:00',
      done: false
    }
  ])

  // ORTAK EV ÜYELERİ
  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Rabia',
      role: 'Ev sahibi',
      room: 'salon',
      emoji: '🧑🏻‍💻'
    },
    {
      id: 2,
      name: 'Ev Üyesi',
      role: 'Üye',
      room: 'yatak',
      emoji: '🧑🏻'
    },
    {
      id: 3,
      name: 'Anne',
      role: 'Ev sahibi',
      room: 'mutfak',
      emoji: '👩🏻‍🍳'
    }
  ])

  return (
    <BrowserRouter>

      <div className="app">

        {/* SOL MENÜ */}
        <Sidebar />

        {/* SAYFALAR */}
        <Routes>

          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <Dashboard
                tasks={tasks}
                setTasks={setTasks}
                members={members}
              />
            }
          />

          {/* EV ÜYELERİ */}
          <Route
            path="/members"
            element={
              <Members
                tasks={tasks}
                setTasks={setTasks}
                members={members}
                setMembers={setMembers}
              />
            }
          />

          {/* TANIMSIZ SAYFALAR */}
          <Route
            path="*"
            element={<Navigate to="/" />}
          />

        </Routes>

      </div>

    </BrowserRouter>
  )
}

export default App
