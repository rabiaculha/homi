
import { useState } from 'react'

function Dashboard({ tasks, setTasks, members }) {

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [taskName, setTaskName] = useState('')
  const [person, setPerson] = useState('')
  const [time, setTime] = useState('')

  const completed = tasks.filter(task => task.done).length
  const pending = tasks.length - completed

  const resetForm = () => {
    setTaskName('')
    setPerson('')
    setTime('')
    setEditingId(null)
    setShowForm(false)
  }

  const saveTask = (e) => {
    e.preventDefault()

    if (!taskName.trim() || !person || !time) return

    if (editingId !== null) {
      setTasks(old => old.map(task =>
        task.id === editingId
          ? { ...task, name: taskName, person, time }
          : task
      ))
    } else {
      setTasks(old => [...old, {
        id: Date.now(),
        name: taskName,
        person,
        time,
        done: false
      }])
    }

    resetForm()
  }

  const editTask = (task) => {
    setTaskName(task.name)
    setPerson(task.person)
    setTime(task.time)
    setEditingId(task.id)
    setShowForm(true)
  }

  const deleteTask = (id) => {
    if (window.confirm('Bu görevi silmek istiyor musun?')) {
      setTasks(old => old.filter(task => task.id !== id))
    }
  }

  const toggleTask = (id) => {
    setTasks(old => old.map(task =>
      task.id === id
        ? { ...task, done: !task.done }
        : task
    ))
  }

  return (
    <main className="main-content">

      {/* ÜST BAŞLIK */}

      <header className="topbar">
        <div>
          <p className="date">PAZARTESİ, 16 KASIM 2026</p>
          <h2>Merhaba! Hoş geldin 👋</h2>
          <p className="subtitle">
            Bugün evimizi birlikte güzelleştirelim.
          </p>
        </div>

        <div className="avatar">R</div>
      </header>

      {/* KARŞILAMA KARTI */}

      <section className="welcome-card">
        <div>
          <p>HOMI EV ASİSTANIN</p>
          <h2>Daha düzenli bir ev,<br />daha mutlu bir yaşam.</h2>
          <span>Ev işlerini kolayca planla ve paylaş.</span>
        </div>

        <div className="home-icon">🏡</div>
      </section>

      {/* GÖREV İSTATİSTİKLERİ */}

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

          <button onClick={() => {
            showForm ? resetForm() : setShowForm(true)
          }}>
            {showForm ? 'Vazgeç' : '+ Görev Ekle'}
          </button>
        </div>

        {/* YENİ GÖREV FORMU */}

        {showForm && (
          <form className="task-form" onSubmit={saveTask}>

            <h3>
              {editingId !== null
                ? 'Görevi Düzenle'
                : 'Yeni Görev Oluştur'}
            </h3>

            {/* GÖREV ADI */}

            <input
              type="text"
              placeholder="Görev adı"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              required
            />

            {/* SORUMLU KİŞİ SEÇİMİ */}

            <select
              value={person}
              onChange={e => setPerson(e.target.value)}
              required
            >
              <option value="">Sorumlu kişiyi seç</option>

              {members.map(member => (
                <option key={member.id} value={member.name}>
                  {member.emoji} {member.name}
                </option>
              ))}

            </select>

            {/* SAAT */}

            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />

            <button type="submit">
              {editingId !== null
                ? 'Değişiklikleri Kaydet'
                : 'Görevi Kaydet'}
            </button>

          </form>
        )}

        {/* GÖREV YOKSA */}

        {tasks.length === 0 && (
          <div className="empty-tasks">
            <span>🌿</span>
            <h3>Henüz görev bulunmuyor.</h3>
            <p>Yeni bir görev ekleyerek başlayabilirsin.</p>
          </div>
        )}

        {/* GÖREV LİSTESİ */}

        {tasks.map(task => (

          <div className="task-item" key={task.id}>

            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
            />

            <span className="task-icon">🏡</span>

            <div className="task-info">
              <h3 className={task.done ? 'completed-task' : ''}>
                {task.name}
              </h3>

              <p>{task.person} · {task.time}</p>
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
