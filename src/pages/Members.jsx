
import { useState } from 'react'

const rooms = [
  {
    id: 'salon',
    name: 'Salon',
    emoji: '🛋️',
    furniture: '🛋️ 🪴 ☕',
    description: 'Dinlenme ve sohbet alanı'
  },
  {
    id: 'mutfak',
    name: 'Mutfak',
    emoji: '🍳',
    furniture: '🍽️ 🥗 🧁',
    description: 'Yemek ve kahve alanı'
  },
  {
    id: 'yatak',
    name: 'Yatak Odası',
    emoji: '🛏️',
    furniture: '🛏️ 🪟 🌷',
    description: 'Dinlenme alanı'
  },
  {
    id: 'banyo',
    name: 'Banyo',
    emoji: '🛁',
    furniture: '🛁 🧼 🪞',
    description: 'Bakım ve temizlik alanı'
  }
]

function Members({ tasks, setTasks, members, setMembers }) {
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState('Üye')
  const [room, setRoom] = useState('salon')
  const [showForm, setShowForm] = useState(false)

  // Profil üzerinden görev ekleme
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')

  const currentRoom = rooms.find(r => r.id === selectedRoom)

  const selectedMember = members.find(
    member => member.id === selectedMemberId
  )

  const memberTasks = selectedMember
    ? tasks.filter(
        task =>
          task.person.trim().toLocaleLowerCase('tr-TR') ===
          selectedMember.name.trim().toLocaleLowerCase('tr-TR')
      )
    : []

  // Yeni üye ekle
  const addMember = e => {
    e.preventDefault()

    if (!name.trim()) return

    // Aynı isimde üye eklenmesini engelle
    const alreadyExists = members.some(
      member =>
        member.name.trim().toLocaleLowerCase('tr-TR') ===
        name.trim().toLocaleLowerCase('tr-TR')
    )

    if (alreadyExists) {
      alert('Bu isimde bir ev üyesi zaten var.')
      return
    }

    setMembers(old => [
      ...old,
      {
        id: Date.now(),
        name: name.trim(),
        role,
        room,
        emoji: '🙂'
      }
    ])

    setName('')
    setRole('Üye')
    setRoom('salon')
    setShowForm(false)
  }

  // Üye sil
  const deleteMember = id => {
    if (window.confirm('Bu üyeyi silmek istiyor musun?')) {
      setMembers(old => old.filter(member => member.id !== id))

      setSelectedMemberId(null)
      setShowTaskForm(false)
    }
  }

  // Oda değiştir
  const moveMember = (id, newRoom) => {
    setMembers(old =>
      old.map(member =>
        member.id === id
          ? { ...member, room: newRoom }
          : member
      )
    )
  }

  // Görev tamamla
  const toggleMemberTask = id => {
    setTasks(old =>
      old.map(task =>
        task.id === id
          ? { ...task, done: !task.done }
          : task
      )
    )
  }

  // Profil üzerinden görev oluştur
  const addTaskToMember = e => {
    e.preventDefault()

    if (!newTaskName.trim() || !newTaskTime || !selectedMember) {
      return
    }

    const newTask = {
      id: Date.now(),
      name: newTaskName.trim(),
      person: selectedMember.name,
      time: newTaskTime,
      done: false
    }

    setTasks(old => [...old, newTask])

    setNewTaskName('')
    setNewTaskTime('')
    setShowTaskForm(false)
  }

  const closeProfile = () => {
    setSelectedMemberId(null)
    setShowTaskForm(false)
    setNewTaskName('')
    setNewTaskTime('')
  }

  return (
    <main className="main-content members-page">

      {/* ÜST BAŞLIK */}
      <header className="topbar">
        <div>
          <p className="date">HOMI · EVİMİZ</p>

          <h2>
            {currentRoom ? currentRoom.name : 'Bizim Evimiz 🏡'}
          </h2>

          <p className="subtitle">
            {currentRoom
              ? currentRoom.description
              : 'İstediğin odaya tıklayarak evimizi keşfet.'}
          </p>
        </div>

        <div className="avatar">R</div>
      </header>

      {/* EV PLANI */}
      {!selectedRoom && (
        <>
          <section className="house-welcome">
            <div>
              <p>WELCOME HOME</p>
              <h2>Evimize hoş geldin!</h2>
              <span>Evimizde {members.length} kişi yaşıyor.</span>
            </div>

            <div className="house-welcome-icon">🏡</div>
          </section>

          <div className="house-heading">
            <div>
              <h2>Ev Planımız</h2>
              <p>Keşfetmek istediğin odayı seç.</p>
            </div>

            <span className="member-count">
              👨‍👩‍👧 {members.length} Üye
            </span>
          </div>

          <section className="house-plan">
            {rooms.map(roomItem => {
              const roomMembers = members.filter(
                member => member.room === roomItem.id
              )

              return (
                <div
                  className={`house-room room-${roomItem.id} clickable-room`}
                  key={roomItem.id}
                  onClick={() => setSelectedRoom(roomItem.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setSelectedRoom(roomItem.id)
                    }
                  }}
                >
                  <div className="room-header">
                    <h3>{roomItem.name}</h3>
                    <span>{roomItem.emoji}</span>
                  </div>

                  <div className="room-furniture">
                    {roomItem.furniture}
                  </div>

                  <div className="room-members">
                    {roomMembers.length > 0 ? (
                      roomMembers.map(member => (
                        <div
                          className="house-member member-clickable"
                          key={member.id}
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedMemberId(member.id)
                          }}
                        >
                          <div className="character">
                            {member.emoji}
                          </div>

                          <div className="character-info">
                            <strong>{member.name}</strong>
                            <span>{member.role}</span>
                          </div>

                          <span className="profile-arrow">›</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-room">
                        <span>🌿</span>
                        <p>Bu oda şimdilik boş.</p>
                      </div>
                    )}
                  </div>

                  <div className="room-description">
                    Odaya gir →
                  </div>
                </div>
              )
            })}
          </section>
        </>
      )}

      {/* ODA DETAYI */}
      {selectedRoom && currentRoom && (
        <section className="room-detail">
          <button
            className="back-room"
            onClick={() => setSelectedRoom(null)}
          >
            ← Ev Planına Dön
          </button>

          <div className={`room-interior room-${currentRoom.id}`}>
            <div className="interior-title">
              <span>{currentRoom.emoji}</span>
              <h2>{currentRoom.name}</h2>
              <p>{currentRoom.description}</p>
            </div>

            <div className="interior-furniture">
              {currentRoom.furniture}
            </div>

            <div className="interior-members">
              {members
                .filter(member => member.room === selectedRoom)
                .map(member => (
                  <div
                    className="interior-person member-clickable"
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <div className="interior-character">
                      {member.emoji}
                    </div>

                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                    <small>Profili görüntüle →</small>
                  </div>
                ))}

              {members.filter(
                member => member.room === selectedRoom
              ).length === 0 && (
                <div className="empty-room">
                  <span>🌿</span>
                  <p>Bu odada henüz kimse yok.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ÜYE EKLEME */}
      <section className="add-member-section">
        <div className="section-heading">
          <div>
            <h2>Ev Halkımız</h2>
            <p>Evimize yeni birini davet et.</p>
          </div>

          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Vazgeç' : '+ Üye Ekle'}
          </button>
        </div>

        {showForm && (
          <form
            className="task-form member-form"
            onSubmit={addMember}
          >
            <h3>Yeni Ev Üyesi</h3>

            <input
              type="text"
              placeholder="Üye adı"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <select
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="Üye">Ev üyesi</option>
              <option value="Ev sahibi">Ev sahibi</option>
            </select>

            <select
              value={room}
              onChange={e => setRoom(e.target.value)}
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button type="submit">
              Üyeyi Eve Ekle
            </button>
          </form>
        )}
      </section>

      {/* ÜYE PROFİLİ */}
      {selectedMember && (
        <div
          className="profile-overlay"
          onClick={closeProfile}
        >
          <div
            className="profile-modal"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="profile-close"
              onClick={closeProfile}
            >
              ×
            </button>

            <div className="profile-avatar">
              {selectedMember.emoji}
            </div>

            <h2>{selectedMember.name}</h2>
            <p>{selectedMember.role}</p>

            <label>Bulunduğu oda</label>

            <select
              value={selectedMember.room}
              onChange={e =>
                moveMember(selectedMember.id, e.target.value)
              }
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* GÖREVLER */}
            <div className="profile-tasks">
              <h3>Görevlerim</h3>

              {memberTasks.length > 0 ? (
                <>
                  {memberTasks.map(task => (
                    <div
                      className="profile-task-item"
                      key={task.id}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleMemberTask(task.id)}
                      />

                      <div>
                        <strong
                          className={
                            task.done ? 'completed-task' : ''
                          }
                        >
                          {task.name}
                        </strong>

                        <span>{task.time}</span>
                      </div>

                      <span className={task.done ? 'done' : 'pending'}>
                        {task.done ? 'Tamamlandı' : 'Bekliyor'}
                      </span>
                    </div>
                  ))}

                  <p className="profile-task-summary">
                    {memberTasks.filter(task => task.done).length}
                    {' / '}
                    {memberTasks.length} görev tamamlandı
                  </p>
                </>
              ) : (
                <p className="no-member-tasks">
                  Henüz bu üyeye atanmış görev yok. 🌿
                </p>
              )}
            </div>

            {/* YENİ GÖREV EKLE */}
            <button
              className="add-profile-task"
              onClick={() => setShowTaskForm(!showTaskForm)}
            >
              {showTaskForm ? 'Vazgeç' : '+ Görev Ekle'}
            </button>

            {showTaskForm && (
              <form
                className="profile-add-task-form"
                onSubmit={addTaskToMember}
              >
                <h3>{selectedMember.name} için yeni görev</h3>

                <input
                  type="text"
                  placeholder="Görev adı"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  required
                />

                <input
                  type="time"
                  value={newTaskTime}
                  onChange={e => setNewTaskTime(e.target.value)}
                  required
                />

                <button type="submit">
                  Görevi Kaydet
                </button>
              </form>
            )}

            <button
              className="profile-delete"
              onClick={() => deleteMember(selectedMember.id)}
            >
              Üyeyi Sil
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Members
