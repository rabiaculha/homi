
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  const [householdId, setHouseholdId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState('Üye')
  const [room, setRoom] = useState('salon')
  const [showForm, setShowForm] = useState(false)

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')

  // VERİLERİ SUPABASE'DEN GETİR
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.')

      // Kullanıcının evini bul
      const { data: membership, error: membershipError } =
        await supabase
          .from('household_members')
          .select('household_id, name, role, room, emoji')
          .eq('user_id', user.id)
          .maybeSingle()

      if (membershipError) throw membershipError
      if (!membership) {
        throw new Error('Kullanıcıya ait ev kaydı bulunamadı.')
      }

      const currentHouseholdId = membership.household_id
      setHouseholdId(currentHouseholdId)

      // Ev üyelerini getir
      const { data: memberRows, error: memberError } =
        await supabase
          .from('members')
          .select('*')
          .eq('household_id', currentHouseholdId)
          .order('created_at', { ascending: true })

      if (memberError) throw memberError

      let loadedMembers = memberRows || []

      // Ev sahibi henüz members tablosunda yoksa ekle
      const ownerExists = loadedMembers.some(
        member =>
          member.name.trim().toLocaleLowerCase('tr-TR') ===
          membership.name.trim().toLocaleLowerCase('tr-TR')
      )

      if (!ownerExists) {
        const { data: owner, error: ownerError } =
          await supabase
            .from('members')
            .insert({
              household_id: currentHouseholdId,
              name: membership.name,
              role: membership.role,
              room: membership.room,
              emoji: membership.emoji || '🏡'
            })
            .select()
            .single()

        if (ownerError) throw ownerError

        loadedMembers = [...loadedMembers, owner]
      }

      setMembers(loadedMembers)

      // Ev görevlerini getir
      const { data: taskRows, error: taskError } =
        await supabase
          .from('tasks')
          .select('*')
          .eq('household_id', currentHouseholdId)
          .order('created_at', { ascending: false })

      if (taskError) throw taskError

      const loadedTasks = (taskRows || []).map(task => {
        const assignedMember = loadedMembers.find(
          member => member.id === task.member_id
        )

        return {
          id: task.id,
          name: task.name,
          person: assignedMember?.name || 'Atanmamış',
          member_id: task.member_id,
          time: task.time || '',
          done: task.done
        }
      })

      setTasks(loadedTasks)

    } catch (error) {
      console.error('Veri yükleme hatası:', error.message)
      alert('Veriler yüklenemedi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const currentRoom = rooms.find(r => r.id === selectedRoom)

  const selectedMember = members.find(
    member => member.id === selectedMemberId
  )

  const memberTasks = selectedMember
    ? tasks.filter(task => task.member_id === selectedMember.id)
    : []

  // YENİ ÜYE EKLE
  const addMember = async e => {
    e.preventDefault()

    if (!name.trim() || !householdId) return

    const alreadyExists = members.some(
      member =>
        member.name.trim().toLocaleLowerCase('tr-TR') ===
        name.trim().toLocaleLowerCase('tr-TR')
    )

    if (alreadyExists) {
      alert('Bu isimde bir ev üyesi zaten var.')
      return
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        household_id: householdId,
        name: name.trim(),
        role,
        room,
        emoji: '🙂'
      })
      .select()
      .single()

    if (error) {
      alert('Üye eklenemedi: ' + error.message)
      return
    }

    setMembers(old => [...old, data])

    setName('')
    setRole('Üye')
    setRoom('salon')
    setShowForm(false)
  }

  // ÜYE SİL
  const deleteMember = async id => {
    if (!window.confirm('Bu üyeyi silmek istiyor musun?')) return

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('household_id', householdId)

    if (error) {
      alert('Üye silinemedi: ' + error.message)
      return
    }

    setMembers(old => old.filter(member => member.id !== id))
    setSelectedMemberId(null)
    setShowTaskForm(false)

    // Üyeye atanmış görevler veritabanında member_id = null olur.
    setTasks(old =>
      old.map(task =>
        task.member_id === id
          ? { ...task, member_id: null, person: 'Atanmamış' }
          : task
      )
    )
  }

  // ODA DEĞİŞTİR
  const moveMember = async (id, newRoom) => {
    const { error } = await supabase
      .from('members')
      .update({ room: newRoom })
      .eq('id', id)
      .eq('household_id', householdId)

    if (error) {
      alert('Oda değiştirilemedi: ' + error.message)
      return
    }

    setMembers(old =>
      old.map(member =>
        member.id === id
          ? { ...member, room: newRoom }
          : member
      )
    )
  }

  // GÖREV TAMAMLA
  const toggleMemberTask = async id => {
    const task = tasks.find(item => item.id === id)
    if (!task) return

    const { error } = await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', id)
      .eq('household_id', householdId)

    if (error) {
      alert('Görev güncellenemedi: ' + error.message)
      return
    }

    setTasks(old =>
      old.map(item =>
        item.id === id
          ? { ...item, done: !item.done }
          : item
      )
    )
  }

  // ÜYEYE GÖREV EKLE
  const addTaskToMember = async e => {
    e.preventDefault()

    if (
      !newTaskName.trim() ||
      !newTaskTime ||
      !selectedMember ||
      !householdId
    ) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        household_id: householdId,
        member_id: selectedMember.id,
        name: newTaskName.trim(),
        time: newTaskTime,
        priority: 'orta',
        done: false
      })
      .select()
      .single()

    if (error) {
      alert('Görev eklenemedi: ' + error.message)
      return
    }

    setTasks(old => [
      ...old,
      {
        id: data.id,
        name: data.name,
        person: selectedMember.name,
        member_id: selectedMember.id,
        time: data.time || '',
        done: data.done
      }
    ])

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

  if (loading) {
    return (
      <main className="main-content">
        <div className="app-loading">Evimiz hazırlanıyor...</div>
      </main>
    )
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
