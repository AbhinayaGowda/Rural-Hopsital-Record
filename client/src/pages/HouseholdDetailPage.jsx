import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import { householdsApi } from '../api/households.js';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import MemberForm from '../features/members/MemberForm.jsx';
import HouseholdForm from '../features/households/HouseholdForm.jsx';
import { fmtStatus, statusColor, fmtGender } from '../utils/format.js';
import { fmtDate, calcAge } from '../utils/date.js';
import styles from './household-detail.module.css';

export default function HouseholdDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { isGroundStaff } = useRole();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: household, isLoading: hLoading } = useQuery({
    queryKey: ['household', id],
    queryFn: () => householdsApi.get(id),
    enabled: !!session,
  });

  const { data: membersData, isLoading: mLoading } = useQuery({
    queryKey: ['household-members', id],
    queryFn: () => householdsApi.listMembers(id, { limit: 100, offset: 0 }),
    enabled: !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => householdsApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['household', id] }); setShowEdit(false); },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload) => householdsApi.addMember(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['household-members', id] }); setShowAddMember(false); },
  });

  if (hLoading) return <Spinner center />;
  if (!household) return <p className={styles.notFound}>Household not found.</p>;

  const members = membersData?.items ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/households" className={styles.back}>← Households</Link>
      </div>

      {/* Household card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.malaria}>{household.malaria_number}</div>
            <h1 className={styles.title}>
              {[household.village, household.district, household.state].filter(Boolean).join(', ') || 'No address'}
            </h1>
          </div>
          <div className={styles.cardActions}>
            <Badge color={statusColor(household.status)}>{fmtStatus(household.status)}</Badge>
            {isGroundStaff && (
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
            )}
          </div>
        </div>

        <div className={styles.meta}>
          {household.address_line && <span>{household.address_line}</span>}
          {household.pincode && <span>PIN {household.pincode}</span>}
          {household.notes && <span className={styles.notes}>{household.notes}</span>}
        </div>
      </div>

      {/* Members */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Members <span className={styles.memberCount}>{members.length}</span></h2>
          <Button size="sm" onClick={() => setShowAddMember(true)}>+ Add Member</Button>
        </div>

        {mLoading && <Spinner center />}

        {!mLoading && members.length === 0 && (
          <div className={styles.empty}>No members yet. Add the first member.</div>
        )}

        {members.length > 0 && (
          <div className={styles.memberGrid}>
            {members.map((m) => (
              <Link key={m.id} to={`/members/${m.id}`} className={styles.memberCard}>
                <div className={styles.memberTop}>
                  <span className={styles.memberName}>{m.full_name}</span>
                  {m.is_head && <Badge color="blue">Head</Badge>}
                </div>
                <div className={styles.memberMeta}>
                  <span>{fmtGender(m.gender)}</span>
                  {m.date_of_birth && <span>{calcAge(m.date_of_birth)} yrs</span>}
                  <span>{m.relation_to_head}</span>
                </div>
                <div className={styles.memberStatus}>
                  <Badge color={statusColor(m.status)}>{fmtStatus(m.status)}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Household">
        <HouseholdForm
          initial={household}
          onSubmit={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
          error={updateMutation.error?.message}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member" wide>
        <MemberForm
          isFirst={members.length === 0}
          onSubmit={(data) => addMemberMutation.mutate(data)}
          loading={addMemberMutation.isPending}
          error={addMemberMutation.error?.message}
          onCancel={() => setShowAddMember(false)}
        />
      </Modal>
    </div>
  );
}
