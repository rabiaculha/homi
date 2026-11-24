
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Auth from './pages/Auth'
import Invite from './pages/Invite'
import ShoppingList from './pages/ShoppingList'
import Tasks from './pages/Tasks'
import FamilyBoard from './pages/FamilyBoard'

import { supabase } from './lib/supabase'
import './App.css'

function AppContent() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  const [householdId, setHouseholdId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])

  // OTURUM KONTROLÜ
  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) console.error(error.message)

      setSession(data?.session ?? null)
      setLoading(false)
    }

    checkSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // EV VE VERİLERİ YÜKLE
  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      if (!session?.user?.id) {
        setHouseholdId(null)
        setMembers([])
        setTasks([])
        setDataLoading(false)
        return
      }

      setDataLoading(true)

      try {
        const userId = session.user.id

        // KULLANICININ EVİNİ BUL
        const { data: membership, error: membershipError } =
          await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle()

        if (membershipError) throw membershipError

        let currentHouseholdId = membership?.household_id

        // EV SAHİPLİĞİNİ KONTROL ET
        if (!currentHouseholdId) {
          const { data: household, error } = await supabase
            .from('households')
            .select('id')
            .eq('owner_id', userId)
            .limit(1)
            .maybeSingle()

          if (error) throw error

          currentHouseholdId = household?.id
        }

        if (!mounted) return

        if (!currentHouseholdId) {
          setHouseholdId(null)
          setMembers([])
          setTasks([])
          return
        }

        setHouseholdId(currentHouseholdId)

        // EV ÜYELERİNİ GETİR
        const { data: memberData, error: memberError } =
          await supabase
            .from('members')
            .select('*')
            .eq('household_id', currentHouseholdId)
            .order('created_at', { ascending: true })

        if (memberError) throw memberError

        // GÖREVLERİ GETİR
        const { data: taskData, error: taskError } =
          await supabase
            .from('tasks')
            .select('*')
            .eq('household_id', currentHouseholdId)
            .order('created_at', { ascending: true })

        if (taskError) throw taskError

        if (!mounted) return

        const formattedMembers = (memberData || []).map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          room: member.room,
          emoji: member.emoji
        }))

        const formattedTasks = (taskData || []).map(task => {
          const assignedMember = formattedMembers.find(
            member => member.id === task.member_id
          )

          return {
            id: task.id,
            name: task.name,
            memberId: task.member_id,
            person: assignedMember?.name || 'Atanmamış',
            time: task.time
              ? String(task.time).slice(0, 5)
              : '',
            done: task.done
          }
        })

        setMembers(formattedMembers)
        setTasks(formattedTasks)

        console.log('Homi verileri yüklendi!')

      } catch (error) {
        console.error('Veri yükleme hatası:', error.message)

        if (mounted) {
          setHouseholdId(null)
          setMembers([])
          setTasks([])
        }
      } finally {
        if (mounted) setDataLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [session])

  // GERÇEK ZAMANLI GÖREV VE ÜYE SENKRONİZASYONU
  useEffect(() => {
    if (!householdId) return

    let active = true

    const refreshSharedData = async () => {
      try {
        const { data: memberData, error: memberError } =
          await supabase
            .from('members')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: true })

        if (memberError) throw memberError

        const formattedMembers = (memberData || []).map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          room: member.room,
          emoji: member.emoji
        }))

        const { data: taskData, error: taskError } =
          await supabase
            .from('tasks')
            .select('*')
            .eq('household_id', householdId)
            .order('created_at', { ascending: true })

        if (taskError) throw taskError

        if (!active) return

        const formattedTasks = (taskData || []).map(task => {
          const assignedMember = formattedMembers.find(
            member => member.id === task.member_id
          )

          return {
            id: task.id,
            name: task.name,
            memberId: task.member_id,
            person: assignedMember?.name || 'Atanmamış',
            time: task.time
              ? String(task.time).slice(0, 5)
              : '',
            done: task.done
          }
        })

        setMembers(formattedMembers)
        setTasks(formattedTasks)

        console.log('Homi verileri senkronize edildi!')

      } catch (error) {
        console.error('Senkronizasyon hatası:', error.message)
      }
    }

    const channel = supabase
      .channel(`household-sync-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`
        },
        refreshSharedData
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `household_id=eq.${householdId}`
        },
        refreshSharedData
      )
      .subscribe(status => {
        console.log('Realtime durumu:', status)
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [householdId])

  // YÜKLEME EKRANI
  if (loading || (session && dataLoading)) {
    return (
      <div className="app-loading">
        Homi hazırlanıyor...
      </div>
    )
  }

  return (
    <Routes>
      {/* GİRİŞ / KAYIT */}
      <Route
        path="/login"
        element={
          session
            ? <Navigate to="/" replace />
            : <Auth />
        }
      />

      {/* DASHBOARD */}
      <Route
        path="/"
        element={
          session ? (
            householdId ? (
              <div className="app">
                <Sidebar />
                <Dashboard
                  tasks={tasks}
                  setTasks={setTasks}
                  members={members}
                  householdId={householdId}
                />
              </div>
            ) : (
              <Navigate to="/invite" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* EV ÜYELERİ */}
      <Route
        path="/members"
        element={
          session ? (
            householdId ? (
              <div className="app">
                <Sidebar />
                <Members
                  tasks={tasks}
                  setTasks={setTasks}
                  members={members}
                  setMembers={setMembers}
                  householdId={householdId}
                />
              </div>
            ) : (
              <Navigate to="/invite" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* AİLE DAVETİ */}
      <Route
        path="/invite"
        element={
          session ? (
            <div className="app">
              <Sidebar />
              <Invite />
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ALIŞVERİŞ LİSTESİ */}
      <Route
        path="/shopping"
        element={
          session ? (
            householdId ? (
              <div className="app">
                <Sidebar />
                <ShoppingList
                  householdId={householdId}
                  members={members}
                />
              </div>
            ) : (
              <Navigate to="/invite" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* KİŞİSEL GÖREVLERİM */}
      <Route
        path="/tasks"
        element={
          session ? (
            householdId ? (
              <div className="app">
                <Sidebar />
                <Tasks
                  householdId={householdId}
                  members={members}
                  userId={session.user.id}
                />
              </div>
            ) : (
              <Navigate to="/invite" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* AİLE PANOSU */}
      <Route
        path="/board"
        element={
          session ? (
            householdId ? (
              <div className="app">
                <Sidebar />
                <FamilyBoard
                  householdId={householdId}
                  members={members}
                  userId={session.user.id}
                />
              </div>
            ) : (
              <Navigate to="/invite" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* TANIMSIZ SAYFALAR */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
