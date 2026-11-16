
import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <h1 className="logo">homi<span>.</span></h1>

      <p className="menu-title">MENU</p>

      <nav>
        <NavLink to="/" end>
          Dashboard
        </NavLink>

        <NavLink to="/members">
          Ev Üyeleri
        </NavLink>

        <a href="#">Görevlerim</a>
        <a href="#">Temizlik Planı</a>
        <a href="#">Alışveriş Listesi</a>
      </nav>

      <div className="sidebar-bottom">
        <p>Home is where life happens.</p>
      </div>
    </aside>
  )
}

export default Sidebar
