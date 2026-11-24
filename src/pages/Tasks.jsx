
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './Tasks.css'

function Tasks({ householdId, members = [], userId }) {
  const [tasks, setTasks] = useState([])
  const [myMemberId, setMyMemberId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Giriş yapan kullanıcının evdeki üye kaydını bul
  useEffect(() => {
    let active = true

    const findMyMember = async () => {
      if (!householdId || !userId || members.length === 0) {
        return
      }

      const { data, error } = await supabase
        .from('household_members')
        .select('name')
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Üye bilgisi alınamadı:', error)
        if (active) {
          setError('Üye bilgisi alınamadı.')
          setLoading(false)
        }
        return
      }

      const matchedMember = members.find(
        member =>
          member.name?.trim().toLocaleLowerCase('tr-TR') ===
          data?.name?.trim().toLocaleLowerCase('tr-TR')
      )

      if (active) {
        setMyMemberId(matchedMember?.id || null)

        if (!matchedMember) {
          setLoading(false)
        }
      }
    }

    findMyMember()

    return () => {
      active = false
    }
  }, [householdId, userId, members])

  // Yalnızca giriş yapan üyeye atanmış görevleri getir
  const loadTasks = useCallback(async () => {
    if (!householdId || !myMemberId) {
      setTasks([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .eq('member_id', myMemberId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Görevler yüklenemedi:', error)
      setError('Görevler yüklenemedi.')
    } else {
      setTasks(data || [])
      setError('')
    }

    setLoading(false)
  }, [householdId, myMemberId])

  // Görevleri yükle ve gerçek zamanlı değişiklikleri dinle
  useEffect(() => {
    if (!householdId || !myMemberId) return

    let active = true

    const refreshTasks = async () => {
      if (!active) return
      await loadTasks()
    }

    setLoading(true)
    refreshTasks()

    const channel = supabase
      .channel(`my-tasks-${householdId}-${myMemberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        refreshTasks
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [householdId, myMemberId, loadTasks])

  // Görevi tamamla veya tekrar yapılacak hale getir
  const toggleTask = async task => {
    const newStatus = !task.done

    const { error } = await supabase
      .from('tasks')
      .update({ done: newStatus })
      .eq('id', task.id)

    if (error) {
      console.error(error)
      setError('Görev güncellenemedi.')
      return
    }

    setTasks(prev =>
      prev.map(item =>
        item.id === task.id
          ? { ...item, done: newStatus }
          : item
      )
    )
  }

  const pendingTasks = tasks.filter(task => !task.done)
  const completedTasks = tasks.filter(task => task.done)

  if (loading) {
    return (
      <main className="tasks-page">
        <p>Görevlerin yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="tasks-page">
      <header className="tasks-header">
        <div>
          <h1>Görevlerim</h1>
          <p>Sana atanan ev işlerini buradan takip edebilirsin.</p>
        </div>
      </header>

      <section className="tasks-stats">
        <div className="task-stat-card">
          <span>Toplam görevim</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="task-stat-card">
          <span>Yapılacak</span>
          <strong>{pendingTasks.length}</strong>
        </div>

        <div className="task-stat-card">
          <span>Tamamlanan</span>
          <strong>{completedTasks.length}</strong>
        </div>
      </section>

      {error && (
        <p className="tasks-error">{error}</p>
      )}

      {!myMemberId ? (
        <div className="tasks-empty">
          <span>Üye kaydın bulunamadı.</span>
          <p>Hesabının ev üyeliğiyle eşleştiğini kontrol et.</p>
        </div>
      ) : (
        <>
          {/* YAPILACAK GÖREVLER */}
          <section className="task-list-section">
            <h2>Yapılacak görevler</h2>

            {pendingTasks.length === 0 ? (
              <div className="tasks-empty">
                <span>Harika! 🎉</span>
                <p>Şu anda sana atanmış bekleyen görev yok.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                />
              ))
            )}
          </section>

          {/* TAMAMLANAN GÖREVLER */}
          <section className="task-list-section">
            <h2>Tamamlanan görevler</h2>

            {completedTasks.length === 0 ? (
              <div className="tasks-empty">
                <p>Henüz tamamladığın görev yok.</p>
              </div>
            ) : (
              completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                />
              ))
            )}
          </section>
        </>
      )}
    </main>
  )
}

// GÖREV KARTI
function TaskCard({ task, onToggle }) {
  return (
    <article className={`task-card ${task.done ? 'task-completed' : ''}`}>
      <div className="task-card-main">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => onToggle(task)}
          aria-label="Görevi tamamlandı olarak işaretle"
        />

        <div className="task-card-info">
          <strong>{task.name}</strong>

          <span>
            Son tarih: {task.due_date || 'Belirtilmedi'}
          </span>

          {task.time && (
            <span>
              Saat: {String(task.time).slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      <div className="task-card-actions">
        <span className="task-status">
          {task.done ? 'Tamamlandı' : 'Bekliyor'}
        </span>
      </div>
    </article>
  )
}

export default Tasks
