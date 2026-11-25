import React, { useEffect, useState } from 'react';
import { apiRequest } from './api/client.js';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const {
    user,
    setUser,
    loading,
    sessionMessage,
    clearSessionMessage,
    login,
    register,
    logout,
  } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // login | register | reset
  const [tab, setTab] = useState('notes'); // notes | profile | admin
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Formularios auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notas
  const [notes, setNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Perfil
  const [revealedPhone, setRevealedPhone] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [updatedPassword, setUpdatedPassword] = useState('');

  // Admin
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const showMessage = (type, text) => setFeedback({ type, text });

  async function loadNotes() {
    try {
      const data = await apiRequest('/api/notes');
      setNotes(data?.notes || []);
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function loadAdminData() {
    try {
      const [uRes, lRes] = await Promise.all([
        apiRequest('/api/admin/users'),
        apiRequest('/api/admin/audit-logs'),
      ]);
      setAdminUsers(uRes?.users || []);
      setAuditLogs(lRes?.events || []);
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  useEffect(() => {
    if (sessionMessage) {
      setFeedback({ type: 'error', text: sessionMessage });
      setNotes([]);
      setRevealedPhone('');
      setAdminUsers([]);
      setAuditLogs([]);
      setTab('notes');
    }
  }, [sessionMessage]);

  useEffect(() => {
    if (user) {
      loadNotes();
      if (user.role === 'admin' && tab === 'admin') {
        loadAdminData();
      }
    }
  }, [user, tab]);

  async function handleLogin(e) {
    e.preventDefault();
    clearSessionMessage();
    setFeedback({ type: '', text: '' });
    try {
      await login({ email, password });
      setPassword('');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    clearSessionMessage();
    setFeedback({ type: '', text: '' });
    try {
      await register({ email, name, phone, password });
      setPassword('');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showMessage('success', data.message);
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      showMessage('success', data.message);
      setAuthMode('login');
      setResetToken('');
      setNewPassword('');
    } catch (err) {
      showMessage('error', err.message);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setNotes([]);
      setRevealedPhone('');
      setAdminUsers([]);
      setAuditLogs([]);
      setTab('notes');
      setFeedback({ type: '', text: '' });
    }
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      if (editingId) {
        await apiRequest(`/api/notes/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        });
        showMessage('success', 'Nota actualizada.');
      } else {
        await apiRequest('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        });
        showMessage('success', 'Nota guardada de forma privada.');
      }
      setNoteTitle('');
      setNoteContent('');
      setEditingId(null);
      loadNotes();
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function handleDeleteNote(id) {
    try {
      // Responde 204 No Content (apiRequest devuelve null)
      await apiRequest(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((item) => item.id !== id));
      showMessage('success', 'Nota eliminada.');
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function handleRevealPhone() {
    try {
      const data = await apiRequest('/api/profile?reveal=true');
      setRevealedPhone(data?.phone || 'Sin dato registrado');
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function handleUpdatePhone(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ phone: profilePhone }),
      });
      setUser((prev) => ({ ...prev, phoneMasked: data.phoneMasked }));
      setRevealedPhone('');
      setProfilePhone('');
      showMessage('success', 'Dato sensible actualizado.');
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword: updatedPassword }),
      });
      setCurrentPassword('');
      setUpdatedPassword('');
      showMessage('success', data.message);
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      showMessage('success', 'Rol actualizado.');
      loadAdminData();
    } catch (err) {
      if (err.code !== 'TOKEN_EXPIRADO') {
        showMessage('error', err.message);
      }
    }
  }

  if (loading) {
    return <div className="container">Cargando...</div>;
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">SecureVault</div>
        {user && (
          <div className="nav-actions">
            <span>{user.name}</span>
            <button className="secondary" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        )}
      </header>

      <main className="container">
        {feedback.text && <div className={`alert ${feedback.type}`}>{feedback.text}</div>}

        {!user ? (
          <div className="card">
            <div className="tabs">
              <button className={authMode === 'login' ? '' : 'secondary'} onClick={() => setAuthMode('login')}>
                Iniciar sesión
              </button>
              <button className={authMode === 'register' ? '' : 'secondary'} onClick={() => setAuthMode('register')}>
                Crear cuenta
              </button>
              <button className={authMode === 'reset' ? '' : 'secondary'} onClick={() => setAuthMode('reset')}>
                Recuperar acceso
              </button>
            </div>

            {authMode === 'login' && (
              <form onSubmit={handleLogin}>
                <h2>Iniciar sesión</h2>
                <label>Correo electrónico</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <label>Contraseña</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Entrar</button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister}>
                <h2>Crear cuenta</h2>
                <label>Nombre completo</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                <label>Correo electrónico</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <label>Teléfono o documento (dato protegido)</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888-1234" />
                <label>Contraseña (mín. 10 caracteres, mayúscula, minúscula, número y símbolo)</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Registrarse</button>
              </form>
            )}

            {authMode === 'reset' && (
              <div>
                <form onSubmit={handleForgot}>
                  <h2>Solicitar recuperación</h2>
                  <label>Correo electrónico</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button type="submit">Generar token</button>
                </form>
                <hr />
                <form onSubmit={handleReset}>
                  <h3>Restablecer contraseña</h3>
                  <label>Token de un solo uso</label>
                  <input type="text" required value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
                  <label>Nueva contraseña</label>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button type="submit">Actualizar contraseña</button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="tabs">
              <button className={tab === 'notes' ? '' : 'secondary'} onClick={() => setTab('notes')}>
                Mis notas privadas
              </button>
              <button className={tab === 'profile' ? '' : 'secondary'} onClick={() => setTab('profile')}>
                Perfil y seguridad
              </button>
              {user.role === 'admin' && (
                <button className={tab === 'admin' ? '' : 'secondary'} onClick={() => setTab('admin')}>
                  Administración
                </button>
              )}
            </div>

            {tab === 'notes' && (
              <div>
                <div className="card">
                  <h2>{editingId ? 'Editar nota privada' : 'Nueva nota privada'}</h2>
                  <form onSubmit={handleSaveNote}>
                    <label>Título</label>
                    <input type="text" required maxLength={120} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                    <label>Contenido</label>
                    <textarea rows={4} required maxLength={4000} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                    <div className="note-actions">
                      <button type="submit">{editingId ? 'Guardar cambios' : 'Guardar nota'}</button>
                      {editingId && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setEditingId(null);
                            setNoteTitle('');
                            setNoteContent('');
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="card">
                  <h2>Tus notas ({notes.length})</h2>
                  {notes.length === 0 ? (
                    <p>Aún no tienes notas guardadas.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="note-item">
                        <strong>{n.title}</strong>
                        <p>{n.content}</p>
                        <div className="note-actions">
                          <button
                            className="secondary"
                            onClick={() => {
                              setEditingId(n.id);
                              setNoteTitle(n.title);
                              setNoteContent(n.content);
                            }}
                          >
                            Editar
                          </button>
                          <button className="danger" onClick={() => handleDeleteNote(n.id)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'profile' && (
              <div>
                <div className="card">
                  <h2>Dato sensible protegido</h2>
                  <p>
                    <strong>Teléfono / documento:</strong>{' '}
                    {revealedPhone || user.phoneMasked || 'No registrado'}
                  </p>
                  <button className="secondary" onClick={handleRevealPhone}>
                    Mostrar valor completo
                  </button>
                  <form onSubmit={handleUpdatePhone} style={{ marginTop: 14 }}>
                    <label>Actualizar teléfono o documento</label>
                    <input type="text" required value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                    <button type="submit">Guardar dato</button>
                  </form>
                </div>

                <div className="card">
                  <h2>Cambiar contraseña</h2>
                  <form onSubmit={handleChangePassword}>
                    <label>Contraseña actual</label>
                    <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <label>Nueva contraseña</label>
                    <input type="password" required value={updatedPassword} onChange={(e) => setUpdatedPassword(e.target.value)} />
                    <button type="submit">Cambiar contraseña</button>
                  </form>
                </div>
              </div>
            )}

            {tab === 'admin' && user.role === 'admin' && (
              <div>
                <div className="card">
                  <h2>Usuarios registrados</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Correo</th>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => (
                        <tr key={u.id}>
                          <td>{u.email}</td>
                          <td>{u.name}</td>
                          <td>{u.role}</td>
                          <td>
                            <button
                              className="secondary"
                              onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            >
                              Cambiar a {u.role === 'admin' ? 'user' : 'admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card">
                  <h2>Bitácora de eventos de seguridad</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Evento</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((ev) => (
                        <tr key={ev.id}>
                          <td>{new Date(ev.created_at).toLocaleString()}</td>
                          <td>{ev.event_type}</td>
                          <td>{ev.ip_address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
