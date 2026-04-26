import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { adminApi } from '../api/admin.js';
import { locationsApi } from '../api/locations.js';
import { fmtRole } from '../utils/format.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import styles from './admin-users.module.css';

const ROLE_COLORS = { admin: 'red', doctor: 'blue', ground_staff: 'green' };

export default function AdminUsersPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [q, setQ]           = useState('');
  const [roleFilter, setRole] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState(null);
  const [assignUser, setAssignUser] = useState(null);
  const dq = useDebounce(q, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', dq, roleFilter, statusFilter],
    queryFn: () => adminApi.listUsers({ q: dq || undefined, role: roleFilter || undefined, status: statusFilter || undefined }),
    enabled: !!session,
  });

  const users = data?.items ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>User Management</h1>
        <Button onClick={() => setShowCreate(true)}>+ New User</Button>
      </div>

      <div className={styles.filters}>
        <Input placeholder="Search by name…" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={roleFilter} onChange={e => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="ground_staff">Ground Staff</option>
        </Select>
        <Select value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {isLoading ? <Spinner center /> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No users found.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td className={styles.name}>{u.full_name}</td>
                  <td><Badge color={ROLE_COLORS[u.role] ?? 'gray'}>{fmtRole(u.role)}</Badge></td>
                  <td className={styles.muted}>{u.phone || '—'}</td>
                  <td>
                    <Badge color={u.is_active ? 'green' : 'gray'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className={styles.actions}>
                    <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>Edit</Button>
                    {u.role !== 'admin' && (
                      <Button variant="ghost" size="sm" onClick={() => setAssignUser(u)}>Locations</Button>
                    )}
                    <ToggleActiveButton user={u} onDone={() => qc.invalidateQueries({ queryKey: ['admin-users'] })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal open title="Create User" onClose={() => setShowCreate(false)} wide>
          <CreateUserForm
            onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['admin-users'] }); }}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {editUser && (
        <Modal open title="Edit User" onClose={() => setEditUser(null)}>
          <EditUserForm
            user={editUser}
            onSuccess={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); }}
            onCancel={() => setEditUser(null)}
          />
        </Modal>
      )}

      {assignUser && (
        <Modal open title={`Assign Locations — ${assignUser.full_name}`} onClose={() => setAssignUser(null)} wide>
          <AssignLocationsPanel userId={assignUser.id} onClose={() => setAssignUser(null)} />
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function ToggleActiveButton({ user, onDone }) {
  const mutation = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, { is_active: !user.is_active }),
    onSuccess: onDone,
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {user.is_active ? 'Disable' : 'Enable'}
    </Button>
  );
}

function CreateUserForm({ onSuccess, onCancel }) {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', role: 'ground_staff', password: '' });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({ mutationFn: () => adminApi.createUser(f), onSuccess });
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className={styles.form}>
      <Input label="Full Name *" value={f.full_name} onChange={set('full_name')} required />
      <Input label="Email *"     type="email" value={f.email} onChange={set('email')} required />
      <Input label="Phone"       value={f.phone} onChange={set('phone')} placeholder="10 digits" />
      <Select label="Role *" value={f.role} onChange={set('role')}>
        <option value="ground_staff">Ground Staff</option>
        <option value="doctor">Doctor</option>
        <option value="admin">Admin</option>
      </Select>
      <Input label="Password *" type="password" value={f.password} onChange={set('password')} required minLength={8} />
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Create</Button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onSuccess, onCancel }) {
  const [f, setF] = useState({ full_name: user.full_name, phone: user.phone ?? '', role: user.role });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const [newPw, setNewPw] = useState('');
  const qc = useQueryClient();

  const updateMut = useMutation({ mutationFn: () => adminApi.updateUser(user.id, f), onSuccess });
  const pwMut = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id, newPw),
    onSuccess: () => { setNewPw(''); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
  });

  return (
    <div className={styles.form}>
      <form onSubmit={e => { e.preventDefault(); updateMut.mutate(); }}>
        <Input label="Full Name" value={f.full_name} onChange={set('full_name')} required />
        <Input label="Phone"     value={f.phone}     onChange={set('phone')} />
        <Select label="Role" value={f.role} onChange={set('role')}>
          <option value="ground_staff">Ground Staff</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </Select>
        {updateMut.error && <p className={styles.error}>{updateMut.error.message}</p>}
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={updateMut.isPending}>Save</Button>
        </div>
      </form>

      <hr className={styles.divider} />
      <p className={styles.sectionLabel}>Reset Password</p>
      <div className={styles.pwRow}>
        <Input placeholder="New password (min 8 chars)" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
        <Button
          variant="secondary"
          loading={pwMut.isPending}
          disabled={newPw.length < 8}
          onClick={() => pwMut.mutate()}
        >
          Reset
        </Button>
      </div>
      {pwMut.isSuccess && <p className={styles.success}>Password reset successfully.</p>}
    </div>
  );
}

// ── AssignLocationsPanel ─────────────────────────────────────

function AssignLocationsPanel({ userId, onClose }) {
  const qc = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['user-assignments', userId],
    queryFn: () => adminApi.getAssignments(userId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['user-assignments', userId] });

  const remDist = useMutation({ mutationFn: (did) => adminApi.removeDistrict(userId, did), onSuccess: invalidate });
  const remVill = useMutation({ mutationFn: (vid) => adminApi.removeVillage(userId, vid),  onSuccess: invalidate });

  if (isLoading) return <Spinner center />;

  const districts = assignments?.districts ?? [];
  const villages  = assignments?.villages  ?? [];

  return (
    <div className={styles.assignPanel}>
      <p className={styles.assignNote}>
        Assign one or more districts or villages. Non-admin users can only see households within their assigned locations.
        You can add as many as needed.
      </p>

      <div className={styles.assignCols}>
        {/* ── District assignments ── */}
        <div className={styles.assignCol}>
          <p className={styles.sectionLabel}>Districts ({districts.length})</p>

          <div className={styles.assignTagList}>
            {districts.length === 0 && <p className={styles.emptyHint}>No districts assigned yet.</p>}
            {districts.map(a => (
              <div key={a.id} className={styles.assignTag}>
                <span>
                  <strong>{a.districts?.name}</strong>
                  {a.districts?.states && <span className={styles.tagSub}> — {a.districts.states.name}</span>}
                </span>
                <button className={styles.removeBtn} onClick={() => remDist.mutate(a.district_id)} title="Remove">×</button>
              </div>
            ))}
          </div>

          <AddDistrictForm userId={userId} onAdded={invalidate} />
        </div>

        {/* ── Village assignments ── */}
        <div className={styles.assignCol}>
          <p className={styles.sectionLabel}>Villages ({villages.length})</p>

          <div className={styles.assignTagList}>
            {villages.length === 0 && <p className={styles.emptyHint}>No villages assigned yet.</p>}
            {villages.map(a => (
              <div key={a.id} className={styles.assignTag}>
                <span>
                  <strong>{a.villages?.name}</strong>
                  {a.villages?.districts && <span className={styles.tagSub}> — {a.villages.districts.name}</span>}
                </span>
                <button className={styles.removeBtn} onClick={() => remVill.mutate(a.village_id)} title="Remove">×</button>
              </div>
            ))}
          </div>

          <AddVillageForm
            userId={userId}
            assignedVillageIds={villages.map(v => v.village_id)}
            onAdded={invalidate}
          />
        </div>
      </div>

      <div className={styles.formActions} style={{ marginTop: 16 }}>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

AssignLocationsPanel.propTypes = { userId: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired };

function AddDistrictForm({ userId, onAdded }) {
  const [stateId,    setStateId]    = useState('');
  const [districtId, setDistrictId] = useState('');
  const [msg, setMsg] = useState('');

  const { data: states = [] }    = useQuery({ queryKey: ['states'],             queryFn: () => locationsApi.states(),                staleTime: Infinity });
  const { data: districts = [] } = useQuery({ queryKey: ['districts', stateId], queryFn: () => locationsApi.districts(stateId),       staleTime: Infinity, enabled: !!stateId });

  const mut = useMutation({
    mutationFn: () => adminApi.addDistrict(userId, districtId),
    onSuccess: () => {
      setDistrictId('');
      setMsg('District assigned.');
      onAdded();
      setTimeout(() => setMsg(''), 2000);
    },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className={styles.addForm}>
      <Select value={stateId} onChange={e => { setStateId(e.target.value); setDistrictId(''); }}>
        <option value="">Select state…</option>
        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      {stateId && (
        <Select value={districtId} onChange={e => setDistrictId(e.target.value)}>
          <option value="">Select district…</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      )}
      <Button size="sm" disabled={!districtId} loading={mut.isPending} onClick={() => mut.mutate()}>
        + Assign District
      </Button>
      {msg && <p className={msg.includes('assigned') ? styles.successMsg : styles.errorMsg}>{msg}</p>}
    </div>
  );
}

AddDistrictForm.propTypes = { userId: PropTypes.string.isRequired, onAdded: PropTypes.func.isRequired };

function AddVillageForm({ userId, assignedVillageIds, onAdded }) {
  const [q, setQ]               = useState('');
  const [villageId, setVillageId] = useState('');
  const [msg, setMsg]             = useState('');
  const dq = useDebounce(q, 300);

  // Global village search — no district required
  const { data: results = [], isFetching } = useQuery({
    queryKey: ['village-search-assign', dq],
    queryFn: () => locationsApi.villages({ q: dq, limit: 20 }),
    enabled: dq.length >= 2,
  });

  const mut = useMutation({
    mutationFn: () => adminApi.addVillage(userId, villageId),
    onSuccess: () => {
      setVillageId('');
      setQ('');
      setMsg('Village assigned.');
      onAdded();
      setTimeout(() => setMsg(''), 2000);
    },
    onError: (e) => setMsg(e.message),
  });

  const selectedVillage = results.find(v => v.id === villageId);

  return (
    <div className={styles.addForm}>
      <Input
        placeholder="Search village by name…"
        value={q}
        onChange={e => { setQ(e.target.value); setVillageId(''); }}
      />
      {dq.length >= 2 && (
        <Select value={villageId} onChange={e => setVillageId(e.target.value)}>
          <option value="">
            {isFetching ? 'Searching…' : results.length === 0 ? 'No villages found' : 'Pick a village…'}
          </option>
          {results.map(v => (
            <option
              key={v.id}
              value={v.id}
              disabled={assignedVillageIds.includes(v.id)}
            >
              {v.name}{v.districts?.name ? ` — ${v.districts.name}` : ''}
              {assignedVillageIds.includes(v.id) ? ' (already assigned)' : ''}
            </option>
          ))}
        </Select>
      )}
      {selectedVillage && (
        <p className={styles.villagePreview}>
          {selectedVillage.name}
          {selectedVillage.districts?.name && ` · ${selectedVillage.districts.name}`}
        </p>
      )}
      <Button size="sm" disabled={!villageId} loading={mut.isPending} onClick={() => mut.mutate()}>
        + Assign Village
      </Button>
      {msg && <p className={msg.includes('assigned') ? styles.successMsg : styles.errorMsg}>{msg}</p>}
      <p className={styles.assignHint}>You can assign as many villages as needed.</p>
    </div>
  );
}

AddVillageForm.propTypes = {
  userId:             PropTypes.string.isRequired,
  assignedVillageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAdded:            PropTypes.func.isRequired,
};
