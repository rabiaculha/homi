
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './FamilyBoard.css'

function FamilyBoard({ householdId, members = [], userId }) {
  const [comments, setComments] = useState([])
  const [authorNames, setAuthorNames] = useState({})
  const [message, setMessage] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [replyTexts, setReplyTexts] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Yorumları ve aile üyelerinin isimlerini getir
  const loadComments = useCallback(async () => {
    if (!householdId) return

    const { data: commentData, error: commentError } = await supabase
      .from('family_comments')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })

    if (commentError) {
      console.error('Yorum yükleme hatası:', commentError)
      setError('Yorumlar yüklenemedi.')
      setLoading(false)
      return
    }

    const { data: householdMembers, error: membersError } =
      await supabase
        .from('household_members')
        .select('user_id, name')
        .eq('household_id', householdId)

    if (membersError) {
      console.error('Üye isimleri yüklenemedi:', membersError)
    } else {
      const names = {}

      ;(householdMembers || []).forEach(member => {
        names[member.user_id] = member.name
      })

      setAuthorNames(names)
    }

    setComments(commentData || [])
    setError('')
    setLoading(false)
  }, [householdId])

  // İlk yükleme ve gerçek zamanlı güncelleme
  useEffect(() => {
    if (!householdId) return

    loadComments()

    const channel = supabase
      .channel(`family-board-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_comments',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          loadComments()
        }
      )
      .subscribe(status => {
        console.log('Aile panosu bağlantısı:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, loadComments])

  // Yorum sahibinin adını bul
  const getAuthorName = comment => {
    if (comment.user_id === userId) return 'Ben'

    return authorNames[comment.user_id] || 'Aile üyesi'
  }

  // Yorumun gönderildiği kişiyi bul
  const getRecipientName = comment => {
    if (!comment.recipient_id) return 'Herkese'

    const member = members.find(
      item => item.id === comment.recipient_id
    )

    return member?.name || 'Aile üyesi'
  }

  // Yeni yorum gönder
  const sendComment = async e => {
    e.preventDefault()

    if (!message.trim()) return

    setSending(true)
    setError('')

    const { error } = await supabase
      .from('family_comments')
      .insert({
        household_id: householdId,
        user_id: userId,
        recipient_id: recipientId || null,
        message: message.trim(),
        parent_id: null,
      })

    setSending(false)

    if (error) {
      console.error('Yorum gönderme hatası:', error)
      setError('Yorum gönderilemedi.')
      return
    }

    setMessage('')
    setRecipientId('')
    await loadComments()
  }

  // Yoruma cevap gönder
  const sendReply = async parentId => {
    const reply = replyTexts[parentId]?.trim()

    if (!reply) return

    setSending(true)
    setError('')

    const { error } = await supabase
      .from('family_comments')
      .insert({
        household_id: householdId,
        user_id: userId,
        recipient_id: null,
        parent_id: parentId,
        message: reply,
      })

    setSending(false)

    if (error) {
      console.error('Cevap gönderme hatası:', error)
      setError('Cevap gönderilemedi.')
      return
    }

    setReplyTexts(prev => ({
      ...prev,
      [parentId]: '',
    }))

    setReplyingTo(null)
    await loadComments()
  }

  // Kendi yorumunu veya cevabını sil
  const deleteComment = async commentId => {
    const confirmed = window.confirm(
      'Bu yorumu silmek istiyor musun?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('family_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)

    if (error) {
      console.error('Yorum silme hatası:', error)
      setError('Yorum silinemedi.')
      return
    }

    await loadComments()
  }

  // Ana yorumları bul
  const mainComments = comments.filter(
    comment => !comment.parent_id
  )

  // Bir yoruma ait cevapları bul
  const getReplies = commentId => {
    return comments.filter(
      comment => comment.parent_id === commentId
    )
  }

  // Tarih formatı
  const formatDate = date => {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Kendi hesabımızı kişi listesinden çıkar
  const otherMembers = members.filter(
    member => member.name !== authorNames[userId]
  )

  return (
    <main className="family-board-page">

      {/* BAŞLIK */}
      <header className="family-board-header">
        <div>
          <span className="family-board-label">
            HOMI · AİLEMİZ
          </span>

          <h1>Aile Panosu</h1>

          <p>
            Birbirimizle paylaşalım, konuşalım ve anlaşalım.
          </p>
        </div>

        <div className="family-board-icon">
          💬
        </div>
      </header>

      {/* YORUM PAYLAŞMA */}
      <section className="family-comment-form">
        <h2>Bir şeyler paylaş</h2>

        <p>
          Mesajını tüm aileye veya belirli bir üyeye gönderebilirsin.
        </p>

        <form onSubmit={sendComment}>
          <label htmlFor="comment-recipient">
            Kime göndermek istiyorsun?
          </label>

          <select
            id="comment-recipient"
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
          >
            <option value="">Herkese gönder</option>

            {otherMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          <label htmlFor="comment-message">
            Mesajın
          </label>

          <textarea
            id="comment-message"
            placeholder="Ailenle paylaşmak istediğin bir şeyler yaz..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
          />

          <div className="family-comment-form-bottom">
            <span>{message.length}/1000</span>

            <button
              type="submit"
              disabled={sending || !message.trim()}
            >
              {sending ? 'Gönderiliyor...' : 'Mesajı Paylaş'}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className="family-board-error">
          {error}
        </p>
      )}

      {/* YORUMLAR */}
      <section className="family-comments-section">
        <div className="family-comments-heading">
          <h2>Aileden gelenler</h2>

          <span>
            {mainComments.length} paylaşım
          </span>
        </div>

        {loading ? (
          <p className="family-board-empty">
            Yorumlar yükleniyor...
          </p>
        ) : mainComments.length === 0 ? (
          <div className="family-board-empty">
            <span>💌</span>
            <h3>Henüz paylaşım yok</h3>
            <p>Ailenin ilk mesajını sen paylaş!</p>
          </div>
        ) : (
          mainComments.map(comment => (
            <article
              className="family-comment-card"
              key={comment.id}
            >
              {/* YORUM SAHİBİ */}
              <div className="family-comment-top">
                <div className="family-comment-avatar">
                  {getAuthorName(comment).charAt(0).toUpperCase()}
                </div>

                <div className="family-comment-author">
                  <strong>
                    {getAuthorName(comment)}
                  </strong>

                  <span>
                    {formatDate(comment.created_at)}
                  </span>
                </div>

                <span className="family-recipient">
                  {getRecipientName(comment)}
                </span>
              </div>

              {/* YORUM METNİ */}
              <p className="family-comment-message">
                {comment.message}
              </p>

              {/* YORUMU SİL */}
              {comment.user_id === userId && (
                <button
                  type="button"
                  className="family-delete-button"
                  onClick={() => deleteComment(comment.id)}
                >
                  Yorumu sil
                </button>
              )}

              {/* CEVAPLAR */}
              <div className="family-replies">
                {getReplies(comment.id).map(reply => (
                  <div
                    className="family-reply"
                    key={reply.id}
                  >
                    <div className="family-reply-top">
                      <strong>
                        {getAuthorName(reply)}
                      </strong>

                      <span>
                        {formatDate(reply.created_at)}
                      </span>
                    </div>

                    <p>{reply.message}</p>

                    {reply.user_id === userId && (
                      <button
                        type="button"
                        className="family-delete-button"
                        onClick={() => deleteComment(reply.id)}
                      >
                        Cevabı sil
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* CEVAP YAZMA */}
              {replyingTo === comment.id ? (
                <div className="family-reply-form">
                  <textarea
                    rows={2}
                    placeholder="Cevabını yaz..."
                    value={replyTexts[comment.id] || ''}
                    onChange={e =>
                      setReplyTexts(prev => ({
                        ...prev,
                        [comment.id]: e.target.value,
                      }))
                    }
                  />

                  <div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                    >
                      Vazgeç
                    </button>

                    <button
                      type="button"
                      disabled={
                        sending ||
                        !replyTexts[comment.id]?.trim()
                      }
                      onClick={() => sendReply(comment.id)}
                    >
                      Cevapla
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="family-reply-trigger"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  ↳ Yanıtla
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </main>
  )
}

export default FamilyBoard
