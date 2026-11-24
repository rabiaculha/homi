
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard({ tasks, setTasks, members, householdId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [taskName, setTaskName] = useState('')
  const [person, setPerson] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  // Profil menüsü
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    const getProfile = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error('Profil bilgisi alınamadı:', error.message)
        return
      }

      setEmail(data.user?.email || '')
    }

    getProfile()
  }, [])

  const completed = tasks.filter(task => task.done).length
  const pending = tasks.length - completed

  const today = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date()).toLocaleUpperCase('tr-TR')

  // FORMU TEMİZLE
  const resetForm = () => {
    setTaskName('')
    setPerson('')
    setTime('')
    setEditingId(null)
    setShowForm(false)
  }

  // GÖREV EKLE / DÜZENLE
  const saveTask = async e => {
    e.preventDefault()

    if (!taskName.trim() || !person || !time) return

    const selectedMember = members.find(
      member => String(member.id) === person
    )

    if (!selectedMember) {
      alert('Lütfen geçerli bir sorumlu seç.')
      return
    }

    if (!householdId) {
      alert('Ev bilgisi bulunamadı.')
      return
    }

    setSaving(true)

    const taskData = {
      name: taskName.trim(),
      member_id: selectedMember.id,
      time,
    }

    try {
      if (editingId !== null) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingId)
          .eq('household_id', householdId)
          .select()
          .single()

        if (error) throw error

        setTasks(old => old.map(task =>
          task.id === editingId
            ? {
                ...task,
                id: data.id,
                name: data.name,
                person: selectedMember.name,
                memberId: selectedMember.id,
                time: String(data.time).slice(0, 5)
              }
            : task
        ))

      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            household_id: householdId,
            member_id: selectedMember.id,
            name: taskName.trim(),
            time,
            priority: 'orta',
            done: false
          })
          .select()
          .single()

        if (error) throw error

        const newTask = {
          id: data.id,
          name: data.name,
          person: selectedMember.name,
          memberId: selectedMember.id,
          time: String(data.time).slice(0, 5),
          done: data.done
        }

        setTasks(old =>
          old.some(task => task.id === data.id)
            ? old
            : [...old, newTask]
        )
      }

      resetForm()

    } catch (error) {
      console.error('Görev kaydetme hatası:', error.message)
      alert('Görev kaydedilemedi: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // GÖREV DÜZENLE
  const editTask = task => {
    const assignedMember = members.find(
      member =>
        String(member.id) === String(task.memberId) ||
        member.name === task.person
    )

    setTaskName(task.name)
    setPerson(assignedMember ? String(assignedMember.id) : '')
    setTime(task.time || '')
    setEditingId(task.id)
    setShowForm(true)
  }

  // GÖREV SİL
  const deleteTask = async id => {
    if (!window.confirm('Bu görevi silmek istiyor musun?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId)

      if (error) throw error

      setTasks(old => old.filter(task => task.id !== id))

    } catch (error) {
      console.error('Görev silme hatası:', error.message)
      alert('Görev silinemedi: ' + error.message)
    }
  }

  // GÖREV TAMAMLA / GERİ AL
  const toggleTask = async task => {
    const newDone = !task.done

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ done: newDone })
        .eq('id', task.id)
        .eq('household_id', householdId)

      if (error) throw error

      setTasks(old => old.map(item =>
        item.id === task.id
          ? { ...item, done: newDone }
          : item
      ))

    } catch (error) {
      console.error('Görev güncelleme hatası:', error.message)
      alert('Görev güncellenemedi: ' + error.message)
    }
  }

  // ŞİFRE DEĞİŞTİR
  const changePassword = async e => {
    e.preventDefault()

    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalı.')
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    setPasswordSaving(false)

    if (error) {
      alert('Şifre değiştirilemedi: ' + error.message)
      return
    }

    alert('Şifren başarıyla değiştirildi.')
    setNewPassword('')
    setShowPasswordForm(false)
    setShowProfileMenu(false)
  }

  // ÇIKIŞ YAP
  const logout = async () => {
    const confirmed = window.confirm(
      'Hesabından çıkış yapmak istiyor musun?'
    )

    if (!confirmed) return

    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Çıkış yapılamadı: ' + error.message)
    }
  }

  return (
    <main className="main-content">

      {/* ÜST BAŞLIK */}
      <header className="topbar">
        <div>
          <p className="date">{today}</p>
          <h2>Merhaba! Hoş geldin 👋</h2>
          <p className="subtitle">
            Bugün evimizi birlikte güzelleştirelim.
          </p>
        </div>

        {/* PROFİL MENÜSÜ */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="avatar"
            onClick={() => setShowProfileMenu(prev => !prev)}
            title="Profil menüsü"
            style={{
              cursor: 'pointer',
              border: 'none',
              font: 'inherit'
            }}
          >
            {email ? email.charAt(0).toUpperCase() : 'R'}
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '65px',
                right: 0,
                width: '260px',
                padding: '20px',
                background: '#ffffff',
                border: '1px solid #e0eee5',
                borderRadius: '16px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.10)',
                zIndex: 1000
              }}
            >
              <h3 style={{ margin: '0 0 12px', color: '#286b5d' }}>
                Hesabım
              </h3>

              <p
                style={{
                  fontSize: '13px',
                  color: '#78958b',
                  overflowWrap: 'anywhere',
                  marginBottom: '18px'
                }}
              >
                {email || 'E-posta bilgisi bulunamadı.'}
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(true)
                  setShowProfileMenu(false)
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  border: 'none',
                  borderRadius: '9px',
                  background: '#e8f4ed',
                  color: '#286b5d',
                  cursor: 'pointer',
                  marginBottom: '9px'
                }}
              >
                Şifre Değiştir
              </button>

              <button
                type="button"
                onClick={logout}
                style={{
                  width: '100%',
                  padding: '11px',
                  border: 'none',
                  borderRadius: '9px',
                  background: '#fff0ed',
                  color: '#bd5c50',
                  cursor: 'pointer'
                }}
              >
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ŞİFRE DEĞİŞTİRME PENCERESİ */}
      {showPasswordForm && (
        <div
          onClick={() => setShowPasswordForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <form
            onSubmit={changePassword}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#ffffff',
              padding: '28px',
              borderRadius: '18px',
              boxShadow: '0 10px 35px rgba(0,0,0,0.15)'
            }}
          >
            <h2 style={{ color: '#286b5d', marginTop: 0 }}>
              Şifre Değiştir
            </h2>

            <p style={{ color: '#78958b', fontSize: '14px' }}>
              Yeni şifreni belirle.
            </p>

            <input
              type="password"
              placeholder="Yeni şifre (en az 6 karakter)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={6}
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                border: '1px solid #dcebe1',
                borderRadius: '9px',
                margin: '12px 0 18px'
              }}
            />

            <button
              type="submit"
              disabled={passwordSaving}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '9px',
                background: '#b9ddc9',
                color: '#286b5d',
                cursor: 'pointer',
                marginBottom: '9px'
              }}
            >
              {passwordSaving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false)
                setNewPassword('')
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '9px',
                background: '#f2f6f3',
                color: '#58776b',
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>
          </form>
        </div>
      )}

      {/* KARŞILAMA KARTI */}
      <section className="welcome-card">
        <div>
          <p>HOMI EV ASİSTANIN</p>
          <h2>
            Daha düzenli bir ev,
            <br />
            daha mutlu bir yaşam.
          </h2>
          <span>
            Ev işlerini kolayca planla ve paylaş.
          </span>
        </div>

        <div className="home-icon">🏡</div>
      </section>

      {/* İSTATİSTİKLER */}
      <section className="stats">
        <div className="stat-card">
          <span>Toplam Görev</span>
          <h2>{tasks.length}</h2>
        </div>

        <div className="stat-card">
          <span>Tamamlanan</span>
          <h2>{completed}</h2>
        </div>

        <div className="stat-card">
          <span>Bekleyen</span>
          <h2>{pending}</h2>
        </div>
      </section>

      {/* GÖREVLER */}
      <section className="tasks">
        <div className="section-heading">
          <div>
            <h2>Bugünün Görevleri</h2>
            <p>Evimiz için yapılacaklar</p>
          </div>

          <button
            type="button"
            onClick={() => {
              showForm ? resetForm() : setShowForm(true)
            }}
          >
            {showForm ? 'Vazgeç' : '+ Görev Ekle'}
          </button>
        </div>

        {/* GÖREV FORMU */}
        {showForm && (
          <form className="task-form" onSubmit={saveTask}>
            <h3>
              {editingId !== null
                ? 'Görevi Düzenle'
                : 'Yeni Görev Oluştur'}
            </h3>

            <input
              type="text"
              placeholder="Görev adı"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              required
            />

            <select
              value={person}
              onChange={e => setPerson(e.target.value)}
              required
            >
              <option value="">
                Sorumlu kişiyi seç
              </option>

              {members.map(member => (
                <option
                  key={member.id}
                  value={String(member.id)}
                >
                  {member.emoji} {member.name}
                </option>
              ))}
            </select>

            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />

            <button type="submit" disabled={saving}>
              {saving
                ? 'Kaydediliyor...'
                : editingId !== null
                  ? 'Değişiklikleri Kaydet'
                  : 'Görevi Kaydet'}
            </button>
          </form>
        )}

        {/* BOŞ GÖREV LİSTESİ */}
        {tasks.length === 0 && (
          <div className="empty-tasks">
            <span>🌿</span>
            <h3>Henüz görev bulunmuyor.</h3>
            <p>
              Yeni bir görev ekleyerek başlayabilirsin.
            </p>
          </div>
        )}

        {/* GÖREV LİSTESİ */}
        {tasks.map(task => (
          <div className="task-item" key={task.id}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task)}
            />

            <span className="task-icon">🏡</span>

            <div className="task-info">
              <h3 className={task.done ? 'completed-task' : ''}>
                {task.name}
              </h3>

              <p>
                {task.person} · {task.time}
              </p>
            </div>

            <span className={task.done ? 'done' : 'pending'}>
              {task.done ? 'Tamamlandı' : 'Bekliyor'}
            </span>

            <div className="task-actions">
              <button
                type="button"
                className="edit-btn"
                onClick={() => editTask(task)}
                title="Düzenle"
              >
                ✏️
              </button>

              <button
                type="button"
                className="delete-btn"
                onClick={() => deleteTask(task.id)}
                title="Sil"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

export default Dashboard
