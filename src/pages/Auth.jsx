
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`
        })

        if (error) throw error

        setMessage('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.')
        return
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        window.location.href = '/'
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        })

        if (error) throw error

        if (data.session) {
          window.location.href = '/'
        } else {
          setMessage('Kayıt başarılı! E-postanı kontrol ederek hesabını doğrula.')
        }
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration">
        <span>🏡</span>
      </div>

      <section className="auth-card">
        <div className="auth-logo">
          <span>H</span>
        </div>

        <p className="auth-brand">HOMI · EVİMİZ</p>

        <h1>
          {isForgotPassword
            ? 'Şifreni mi unuttun?'
            : isLogin
              ? 'Tekrar hoş geldin!'
              : 'Homi’ye hoş geldin!'}
        </h1>

        <p className="auth-subtitle">
          {isForgotPassword
            ? 'Şifreni yenilemek için e-posta adresini gir.'
            : isLogin
              ? 'Evini yönetmeye kaldığın yerden devam et.'
              : 'Homi hesabını oluştur.'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && !isForgotPassword && (
            <div className="auth-field">
              <label>Adın</label>
              <input
                type="text"
                placeholder="Adını gir"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>E-posta</label>
            <input
              type="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {isLogin && !isForgotPassword && (
            <div className="auth-field">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />

              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setIsForgotPassword(true)
                  setMessage('')
                }}
              >
                Şifremi Unuttum?
              </button>
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div className="auth-field">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Lütfen bekle...'
              : isForgotPassword
                ? 'Sıfırlama Bağlantısı Gönder'
                : isLogin
                  ? 'Giriş Yap'
                  : 'Hesap Oluştur'}
          </button>
        </form>

        <div className="auth-switch">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false)
                setMessage('')
              }}
            >
              Giriş ekranına dön
            </button>
          ) : (
            <>
              {isLogin ? 'Henüz hesabın yok mu?' : 'Zaten hesabın var mı?'}

              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setMessage('')
                }}
              >
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default Auth
