
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Invite.css'

function Invite() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)

  // DAVET KODU OLUŞTUR
  const createInvite = async () => {
    setLoading(true)
    setMessage('')
    setCreatedCode('')
    setCopied(false)

    try {
      const { data, error } = await supabase.rpc(
        'create_household_invite'
      )

      if (error) throw error

      setCreatedCode(String(data))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // KODU KOPYALA
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(createdCode)
      setCopied(true)
    } catch {
      setMessage('Kod kopyalanamadı. Manuel olarak kopyalayabilirsin.')
    }
  }

  // DAVET KODUYLA EVE KATIL
  const joinHousehold = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc(
        'join_household',
        {
          p_code: code.trim(),
          p_name: name.trim()
        }
      )

      if (error) throw error

      setMessage('Evine başarıyla katıldın! 🏡')

      setTimeout(() => {
        window.location.href = '/'
      }, 1200)

    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="main-content invite-page">

      <div className="invite-container">

        {/* BAŞLIK */}

        <div className="invite-header">
          <span className="invite-header-icon">🏡</span>

          <p className="invite-label">HOMI FAMILY</p>

          <h1>Ailenle Birlikte, Daha Kolay!</h1>

          <p>
            Evinizi paylaşın, görevleri birlikte yönetin
            ve hayatınızı kolaylaştırın.
          </p>
        </div>

        {/* DAVET KODU OLUŞTURMA */}

        <section className="invite-card create-invite">

          <div className="invite-card-icon">✉️</div>

          <h2>Aileni Homi'ye Davet Et</h2>

          <p>
            Ailenle paylaşmak için sana özel bir
            davet kodu oluştur.
          </p>

          <button
            className="invite-primary-btn"
            onClick={createInvite}
            disabled={loading}
          >
            {loading
              ? 'Kod oluşturuluyor...'
              : '＋ Davet Kodu Oluştur'}
          </button>

          {/* OLUŞAN KOD BURADA GÖRÜNECEK */}

          {createdCode && (
            <div className="generated-code">

              <span className="code-caption">
                EVİNİN DAVET KODU
              </span>

              <div className="code-display">
                <strong>{createdCode}</strong>

                <button
                  type="button"
                  onClick={copyCode}
                  className="copy-btn"
                >
                  {copied ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>

              <p>
                Bu kodu ailene gönder.
                Kendi hesaplarını oluşturarak evine katılabilirler.
              </p>

            </div>
          )}

        </section>

        {/* AYIRICI */}

        <div className="invite-divider">
          <span>VEYA</span>
        </div>

        {/* EVE KATILMA */}

        <section className="invite-card join-invite">

          <div className="invite-card-icon">🤝</div>

          <h2>Davet Koduyla Eve Katıl</h2>

          <p>
            Ailenden aldığın kodu girerek ortak evinize katıl.
          </p>

          <form onSubmit={joinHousehold}>

            <div className="invite-input-group">
              <label>Adın</label>

              <input
                type="text"
                placeholder="Örn. Anne"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="invite-input-group">
              <label>Davet Kodu</label>

              <input
                type="text"
                placeholder="Aileden aldığın kodu gir"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="invite-primary-btn"
              disabled={loading}
            >
              {loading ? 'Katılınıyor...' : 'Evime Katıl →'}
            </button>

          </form>

        </section>

        {/* BİLGİ MESAJI */}

        {message && (
          <div className="invite-message">
            {message}
          </div>
        )}

        <p className="invite-footer">
          Birlikte yaşamak, birlikte paylaşmak. 💚
        </p>

      </div>
    </main>
  )
}

export default Invite
