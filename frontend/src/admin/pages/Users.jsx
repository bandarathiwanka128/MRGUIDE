import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Ban, CheckCircle, Eye } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import api from '../api/axios';

const ROLES = ['user', 'authentic_user', 'admin'];

function RoleBadge({ role }) {
  const map = { admin: 'badge-purple', authentic_user: 'badge-blue', user: 'badge-gray' };
  return <span className={`badge ${map[role] || 'badge-gray'}`}>{role}</span>;
}

function StatusBadge({ status }) {
  return <span className={`badge ${!status || status === 'active' ? 'badge-green' : 'badge-red'}`}>{status || 'active'}</span>;
}

const EMPTY_FORM = { username: '', email: '', password: '', role: 'user', mobile_number: '', country: '' };

export default function Users() {
  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('');
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleF) params.role = roleF;
      const res = await api.get('/users', { params });
      setData(res.data);
    } catch { toast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, search, roleF]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = e => { setSearch(e.target.value); setPage(1); };

  const openEdit = user => {
    setForm({ username: user.username, email: user.email, password: '', role: user.role, mobile_number: user.mobile_number || '', country: user.country || '' });
    setEditModal(user);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editModal) {
        const body = { ...form };
        if (!body.password) delete body.password;
        await api.put(`/users/${editModal.id}`, body);
        toast('User updated', 'success');
        setEditModal(null);
      } else {
        await api.post('/users', form);
        toast('User created', 'success');
        setCreateModal(false);
      }
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const toggleBlock = async user => {
    try {
      const res = await api.patch(`/users/${user.id}/block`);
      toast(`User ${res.data.status}`, res.data.status === 'active' ? 'success' : 'info');
      load();
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const deleteUser = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast('User deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) { toast(err.response?.data?.error || 'Delete failed', 'error'); }
  };

  const openCreate = () => { setForm(EMPTY_FORM); setCreateModal(true); };

  const renderFormBody = () => (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Password {editModal ? '(leave blank to keep)' : '*'}</label>
          <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <input className="form-input" value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))} placeholder="+94 77 123 4567" />
        </div>
        <div className="form-group">
          <label className="form-label">Country</label>
          <input className="form-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Sri Lanka" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header
        title="Users"
        subtitle={`${data.total} total users`}
        actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add User</button>}
      />
      <div className="page-content">
        <div className="card">
          <div className="toolbar">
            <div className="search-bar" style={{ minWidth: 240 }}>
              <Search size={15} />
              <input placeholder="Search by name or emailâ€¦" value={search} onChange={handleSearch} />
            </div>
            <div className="tabs">
              {[['', 'All'], ['user', 'Users'], ['authentic_user', 'Authentic'], ['admin', 'Admins']].map(([v, l]) => (
                <button key={v} className={`tab-btn${roleF === v ? ' active' : ''}`} onClick={() => { setRoleF(v); setPage(1); }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Status</th><th>Mobile</th><th>Country</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7}><div className="loading-wrap"><div className="spinner" /></div></td></tr>}
                {!loading && data.users.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No users found</p></div></td></tr>}
                {!loading && data.users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar" style={{ background: u.role === 'authentic_user' ? 'var(--purple)' : u.role === 'admin' ? 'var(--gold)' : 'var(--blue)' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div><div className="u-name">{u.username}</div><div className="u-email">{u.email}</div></div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="td-muted">{u.mobile_number || 'â€”'}</td>
                    <td className="td-muted">{u.country || 'â€”'}</td>
                    <td className="td-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'â€”'}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon" title="View" onClick={() => setViewModal(u)}><Eye size={14} /></button>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(u)}><Edit size={14} /></button>
                        <button className={`btn-icon ${u.status === 'blocked' ? 'success' : ''}`} title={u.status === 'blocked' ? 'Unblock' : 'Block'} onClick={() => toggleBlock(u)}>
                          {u.status === 'blocked' ? <CheckCircle size={14} /> : <Ban size={14} />}
                        </button>
                        {u.role !== 'admin' && <button className="btn-icon danger" title="Delete" onClick={() => setDeleteTarget(u)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} total={data.total} limit={20} onPage={setPage} />
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New User"
        footer={<><button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Savingâ€¦' : 'Create User'}</button></>}>
        {renderFormBody()}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit User"
        footer={<><button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Savingâ€¦' : 'Save Changes'}</button></>}>
        {renderFormBody()}
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="User Details">
        {viewModal && (
          <div className="detail-grid">
            {[['ID', viewModal.id], ['Username', viewModal.username], ['Email', viewModal.email], ['Role', viewModal.role], ['Status', viewModal.status || 'active'], ['Mobile', viewModal.mobile_number || 'â€”'], ['Country', viewModal.country || 'â€”'], ['Joined', viewModal.created_at ? new Date(viewModal.created_at).toLocaleString() : 'â€”']].map(([l, v]) => (
              <div className="detail-item" key={l}><label>{l}</label><p>{String(v)}</p></div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={deleteUser}>Delete User</button></>}>
        {deleteTarget && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="confirm-icon danger"><Trash2 size={24} /></div>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Are you sure you want to delete <strong>{deleteTarget.username}</strong>? This cannot be undone.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
