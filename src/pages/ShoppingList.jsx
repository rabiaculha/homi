
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ShoppingList.css'

function ShoppingList({ householdId, members = [] }) {
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savedItems, setSavedItems] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Alışveriş ürünlerini getir
  const loadItems = async () => {
    if (!householdId) return

    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Alışveriş listesi yüklenemedi:', error)
      setError('Alışveriş listesi yüklenirken bir hata oluştu.')
    } else {
      setItems(data || [])
    }

    setLoading(false)
  }

  // İlk yükleme ve gerçek zamanlı güncelleme
  useEffect(() => {
    if (!householdId) return

    loadItems()

    const channel = supabase
      .channel(`shopping-items-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          loadItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])

  // Yeni ürün ekle
  const addItem = async (e) => {
    e.preventDefault()

    const name = newItem.trim()
    if (!name || !householdId) return

    setError('')

    const { error } = await supabase
      .from('shopping_items')
      .insert([
        {
          household_id: householdId,
          name,
          quantity: 1,
          purchased: false,
          purchased_by: null,
          paid_amount: null,
        },
      ])

    if (error) {
      console.error(error)
      setError('Ürün eklenemedi. Tekrar deneyebilir misin?')
      return
    }

    setNewItem('')
    loadItems()
  }

  // Ürünün alındı durumunu değiştir
  const togglePurchased = async (item) => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ purchased: !item.purchased })
      .eq('id', item.id)

    if (error) {
      console.error(error)
      setError('Ürün durumu güncellenemedi.')
      return
    }

    loadItems()
  }

  // Miktarı artır veya azalt
  const changeQuantity = async (item, amount) => {
    const newQuantity = Math.max(1, (item.quantity || 1) + amount)

    const { error } = await supabase
      .from('shopping_items')
      .update({ quantity: newQuantity })
      .eq('id', item.id)

    if (error) {
      console.error(error)
      setError('Ürün miktarı güncellenemedi.')
      return
    }

    loadItems()
  }

  // Ürünü sil
  const deleteItem = async (id) => {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setError('Ürün silinemedi.')
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  // Alan kişi ve tutar taslağını getir
  const getDraft = (item) => {
    return drafts[item.id] || {
      purchased_by: item.purchased_by || '',
      paid_amount: item.paid_amount ?? '',
    }
  }

  // Taslak değiştiğinde Kaydet butonunu tekrar göster
  const updateDraft = (itemId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))

    setSavedItems((prev) => ({
      ...prev,
      [itemId]: false,
    }))
  }

  // Alışveriş bilgisini kaydet
  const savePurchaseInfo = async (itemId) => {
    const item = items.find((item) => item.id === itemId)
    if (!item) return

    const draft = getDraft(item)

    const amount =
      draft.paid_amount === '' ? null : Number(draft.paid_amount)

    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setError('Lütfen geçerli bir tutar gir.')
      return
    }

    setSavingId(itemId)
    setError('')

    const { error } = await supabase
      .from('shopping_items')
      .update({
        purchased_by: draft.purchased_by || null,
        paid_amount: amount,
      })
      .eq('id', itemId)

    setSavingId(null)

    if (error) {
      console.error(error)
      setError('Bilgiler kaydedilemedi. Tekrar deneyebilir misin?')
      return
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              purchased_by: draft.purchased_by || null,
              paid_amount: amount,
            }
          : item
      )
    )

    setSavedItems((prev) => ({
      ...prev,
      [itemId]: true,
    }))
  }

  // Toplam harcama
  const totalSpent = items.reduce((total, item) => {
    if (!item.purchased) return total
    return total + Number(item.paid_amount || 0)
  }, 0)

  // Alınan ürün sayısı
  const purchasedCount = items.filter((item) => item.purchased).length

  // Para formatı
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  // Alan kişinin adını bul
  const getMemberName = (memberId) => {
    const member = members.find((member) => member.id === memberId)
    return member?.name || 'Bilinmiyor'
  }

  if (loading) {
    return (
      <main className="shopping-page">
        <p>Alışveriş listesi yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="shopping-page">
      <div className="shopping-header">
        <div>
          <h1>Alışveriş Listemiz 🛒</h1>
          <p>Evimizin ihtiyaçlarını birlikte takip edelim.</p>
        </div>

        <div className="shopping-total">
          <strong>{items.length}</strong>
          <span>Toplam ürün</span>
        </div>
      </div>

      <section className="shopping-container">
        {/* Ürün ekleme */}
        <form className="shopping-form" onSubmit={addItem}>
          <input
            type="text"
            placeholder="Örn. Süt, ekmek, yumurta..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />

          <button type="submit">+ Ürün Ekle</button>
        </form>

        {error && <p className="shopping-error">{error}</p>}

        {/* Harcama özeti */}
        <div className="shopping-expense-summary">
          <div>
            <span>Alınan ürün</span>
            <strong>
              {purchasedCount} / {items.length}
            </strong>
          </div>

          <div>
            <span>Toplam harcama</span>
            <strong>{formatMoney(totalSpent)}</strong>
          </div>
        </div>

        {/* Ürün listesi */}
        <div className="shopping-list-heading">
          <h2>Alışveriş Ürünleri</h2>
          <span>
            {purchasedCount}/{items.length} alındı
          </span>
        </div>

        <div className="shopping-items">
          {items.length === 0 ? (
            <div className="shopping-empty">
              <span>🛒</span>
              <p>Henüz alışveriş listemizde ürün yok.</p>
              <small>İlk ürününü ekleyerek başlayabilirsin.</small>
            </div>
          ) : (
            items.map((item) => {
              const draft = getDraft(item)

              return (
                <div className="shopping-item" key={item.id}>
                  <div className="shopping-item-top">
                    <label className="shopping-item-name">
                      <input
                        type="checkbox"
                        checked={item.purchased}
                        onChange={() => togglePurchased(item)}
                      />

                      <span className={item.purchased ? 'purchased' : ''}>
                        {item.name}
                      </span>
                    </label>

                    <div className="shopping-item-actions">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item, -1)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>

                      <strong>{item.quantity}</strong>

                      <button
                        type="button"
                        onClick={() => changeQuantity(item, 1)}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        className="shopping-delete-button"
                        onClick={() => deleteItem(item.id)}
                        aria-label={`${item.name} ürününü sil`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Alan kişi ve ödeme bilgileri */}
                  <div className="shopping-purchase-fields">
                    <label>
                      <span>Alan kişi</span>

                      <select
                        value={draft.purchased_by}
                        onChange={(e) =>
                          updateDraft(
                            item.id,
                            'purchased_by',
                            e.target.value
                          )
                        }
                      >
                        <option value="">Üye seç</option>

                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Ödenen tutar (TL)</span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Örn. 45,50"
                        value={draft.paid_amount}
                        onChange={(e) =>
                          updateDraft(
                            item.id,
                            'paid_amount',
                            e.target.value
                          )
                        }
                      />
                    </label>

                    {savedItems[item.id] ? (
                      <span className="shopping-saved-text">
                        ✓ Kaydedildi
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="shopping-save-button"
                        onClick={() => savePurchaseInfo(item.id)}
                        disabled={savingId === item.id}
                      >
                        {savingId === item.id
                          ? 'Kaydediliyor...'
                          : 'Kaydet'}
                      </button>
                    )}
                  </div>

                  {item.purchased && item.purchased_by && (
                    <p className="shopping-purchase-detail">
                      {getMemberName(item.purchased_by)} aldı
                      {item.paid_amount !== null &&
                        item.paid_amount !== undefined &&
                        ` · ${formatMoney(Number(item.paid_amount))}`}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}

export default ShoppingList
