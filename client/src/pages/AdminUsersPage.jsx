import { useState } from 'react';
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
                    <Button variant="ghost" size="sm" onClick={() => setAssignUser(u)}>Locations</Button>
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

function AssignLocationsPanel({ userId, onClose }) {
  const qc = useQueryClient();
  const [stateId, setStateId]     = useState('');
  const [districtId, setDistrictId] = useState('');
  const [villageId, setVillageId]   = useState('');
  const [villageQ, setVillageQ]     = useState('');
  const dVq = useDebounce(villageQ, 300);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['user-assignments', userId],
    queryFn: () => adminApi.getAssignments(userId),
  });

  const { data: states  = [] } = useQuery({ queryKey: ['states'],                     queryFn: () => locationsApi.states(),                              staleTime: Infinity });
  const { data: districts = [] } = useQuery({ queryKey: ['districts', stateId],        queryFn: () => locationsApi.districts(stateId || undefined),       enabled: !!stateId, staleTime: Infinity });
  const { data: villages  = [] } = useQuery({ queryKey: ['villages', districtId, dVq], queryFn: () => locationsApi.villages({ districtId, q: dVq || undefined }), enabled: !!districtId });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['user-assignments', userId] });

  const addDist  = useMutation({ mutationFn: () => adminApi.addDistrict(userId, districtId), onSuccess: invalidate });
  const addVill  = useMutation({ mutationFn: () => adminApi.addVillage(userId, villageId),   onSuccess: invalidate });
  const remDist  = useMutation({ mutationFn: (did) => adminApi.removeDistrict(userId, did),  onSuccess: invalidate });
  const remVill  = useMutation({ mutationFn: (vid) => adminApi.removeVillage(userId, vid),   onSuccess: invalidate });

  if (isLoading) return <Spinner center />;

  return (
    <div className={styles.assignPanel}>
      <div className={styles.assignCols}>
        {/* Current assignments */}
        <div className={styles.assignCol}>
          <p className={styles.sectionLabel}>Current District Assignments</p>
          {assignments?.districts?.length === 0 && <p className={styles.muted}>None</p>}
          {assignments?.districts?.map(a => (
            <div key={a.id} className={styles.assignTag}>
              <span>{a.districts?.states?.code} — {a.districts?.name}</span>
              <button className={styles.removeBtn} onClick={() => remDist.mutate(a.district_id)}>×</button>
            </div>
          ))}

          <p className={styles.sectionLabel} style={{ marginTop: 16 }}>Current Village Assignments</p>
          {assignments?.villages?.length === 0 && <p className={styles.muted}>None</p>}
          {assignments?.villages?.map(a => (
            <div key={a.id} className={styles.assignTag}>
              <span>{a.villages?.name} ({a.villages?.districts?.name})</span>
              <button className={styles.removeBtn} onClick={() => remVill.mutate(a.village_id)}>×</button>
            </div>
          ))}
        </div>

        {/* Add assignment */}
        <div className={styles.assignCol}>
          <p className={styles.sectionLabel}>Add District</p>
          <Select value={stateId} onChange={e => { setStateId(e.target.value); setDistrictId(''); }}>
            <option value="">Select state…</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          {stateId && (
            <>
              <Select value={districtId} onChange={e => setDistrictId(e.target.value)}>
                <option value="">Select district…</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <Button size="sm" disabled={!districtId} loading={addDist.isPending} onClick={() => addDist.mutate()}>
                Assign District
              </Button>
            </>
          )}

          <p className={styles.sectionLabel} style={{ marginTop: 16 }}>Add Village</p>
          {stateId && districtId && (
            <>
              <Input placeholder="Search village…" value={villageQ} onChange={e => setVillageQ(e.target.value)} />
              <Select value={villageId} onChange={e => setVillageId(e.target.value)}>
                <option value="">Select village…</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
              <Button size="sm" disabled={!villageId} loading={addVill.isPending} onClick={() => addVill.mutate()}>
                Assign Village
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.formActions} style={{ marginTop: 16 }}>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
