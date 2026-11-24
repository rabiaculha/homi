
import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <h1 className="logo">
        homi<span>.</span>
      </h1>

      <p className="menu-title">MENU</p>

      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/members">Ev Üyeleri</NavLink>
        <NavLink to="/invite">Aile Daveti</NavLink>
        <NavLink to="/tasks">Görevlerim</NavLink>
        <NavLink to="/board">Aile Panosu</NavLink>
        <NavLink to="/shopping">Alışveriş Listesi</NavLink>
      </nav>

      <div className="sidebar-bottom">
        <p>Home is where life happens.</p>
      </div>
    </aside>
  )
}

export default Sidebar
