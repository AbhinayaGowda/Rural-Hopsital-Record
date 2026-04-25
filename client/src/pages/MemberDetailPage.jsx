import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import { membersApi } from '../api/members.js';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import MemberForm from '../features/members/MemberForm.jsx';
import VisitList from '../features/visits/VisitList.jsx';
import VisitForm from '../features/visits/VisitForm.jsx';
import DiseaseHistoryList from '../features/diseaseHistory/DiseaseHistoryList.jsx';
import DiseaseHistoryForm from '../features/diseaseHistory/DiseaseHistoryForm.jsx';
import PregnancyList from '../features/pregnancies/PregnancyList.jsx';
import PregnancyForm from '../features/pregnancies/PregnancyForm.jsx';
import VaccinationList from '../features/vaccinations/VaccinationList.jsx';
import ReferralList from '../features/referrals/ReferralList.jsx';
import ReferralForm from '../features/referrals/ReferralForm.jsx';
import { fmtGender, fmtStatus, statusColor } from '../utils/format.js';
import { fmtDate, calcAge } from '../utils/date.js';
import styles from './member-detail.module.css';

const ALL_TABS = ['Info', 'Visits', 'Disease History', 'Pregnancies', 'Vaccinations', 'Referrals'];

export default function MemberDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { isDoctor, isGroundStaff } = useRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Info');
  const [showEdit, setShowEdit] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);
  const [showPregnancyForm, setShowPregnancyForm] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.get(id),
    enabled: !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => membersApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member', id] }); setShowEdit(false); },
  });

  if (isLoading) return <Spinner center />;
  if (!member) return <p style={{ padding: 24, color: 'var(--color-muted)' }}>Member not found.</p>;

  const age = calcAge(member.date_of_birth);
  const isFemale = member.gender === 'F';

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to={`/households/${member.household_id}`} className={styles.back}>← Household</Link>
      </div>

      {/* Member card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.avatar}>{member.full_name[0]?.toUpperCase()}</div>
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{member.full_name}</h1>
              {member.is_head && <Badge color="blue">Household Head</Badge>}
              <Badge color={statusColor(member.status)}>{fmtStatus(member.status)}</Badge>
            </div>
            <div className={styles.meta}>
              <span>{fmtGender(member.gender)}{age !== null ? `, ${age} yrs` : ''}</span>
              {member.date_of_birth && <span>DOB: {fmtDate(member.date_of_birth)}</span>}
              {member.contact_number && <span>📞 {member.contact_number}</span>}
              {member.aadhaar  && <span>Aadhaar: ••••{member.aadhaar.slice(-4)}</span>}
              {member.abha_id && <span>ABHA: {member.abha_id}</span>}
              <span className={styles.relation}>{member.relation_to_head}</span>
            </div>
            {member.health_id && (
              <div className={styles.healthId}>
                <span className={styles.healthIdLabel}>Health ID</span>
                <span className={styles.healthIdValue}>{member.health_id}</span>
              </div>
            )}
          </div>
          <div className={styles.cardActions}>
            <a
              href={membersApi.healthCard(id)}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ↓ Health Card
            </a>
            {isGroundStaff && (
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {ALL_TABS
          .filter(t => t !== 'Pregnancies' || isFemale)
          .filter(t => t !== 'Referrals' || isDoctor)
          .map((t) => (
          <button
            key={t}
            className={[styles.tab, tab === t ? styles.tabActive : ''].join(' ')}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.tabBody}>
        {tab === 'Info' && (
          <div className={styles.infoGrid}>
            {member.health_id && <InfoRow label="Health ID" value={member.health_id} mono />}
            <InfoRow label="Relation to head" value={member.relation_to_head} />
            <InfoRow label="Gender" value={fmtGender(member.gender)} />
            <InfoRow label="Date of birth" value={fmtDate(member.date_of_birth)} />
            <InfoRow label="Contact" value={member.contact_number} />
            <InfoRow label="Status" value={fmtStatus(member.status)} />
            {member.deceased_date && <InfoRow label="Deceased on" value={fmtDate(member.deceased_date)} />}
            {member.migrated_date && <InfoRow label="Migrated on" value={fmtDate(member.migrated_date)} />}
          </div>
        )}

        {tab === 'Visits' && (
          <>
            {isDoctor && (
              <div className={styles.tabAction}>
                <Button size="sm" onClick={() => setShowVisitForm(true)}>+ Log Visit</Button>
              </div>
            )}
            <VisitList memberId={id} />
          </>
        )}

        {tab === 'Disease History' && (
          <>
            {isDoctor && (
              <div className={styles.tabAction}>
                <Button size="sm" onClick={() => setShowDiseaseForm(true)}>+ Add Condition</Button>
              </div>
            )}
            <DiseaseHistoryList memberId={id} />
          </>
        )}

        {tab === 'Pregnancies' && isFemale && (
          <>
            {isDoctor && (
              <div className={styles.tabAction}>
                <Button size="sm" onClick={() => setShowPregnancyForm(true)}>+ New Pregnancy</Button>
              </div>
            )}
            <PregnancyList memberId={id} />
          </>
        )}

        {tab === 'Vaccinations' && (
          <VaccinationList memberId={id} />
        )}

        {tab === 'Referrals' && isDoctor && (
          <>
            <div className={styles.tabAction}>
              <Button size="sm" onClick={() => setShowReferralForm(true)}>+ New Referral</Button>
            </div>
            <ReferralList memberId={id} />
          </>
        )}
      </div>

      {/* Modals */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Member" wide>
        <MemberForm
          initial={member}
          onSubmit={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
          error={updateMutation.error?.message}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <Modal open={showVisitForm} onClose={() => setShowVisitForm(false)} title="Log Doctor Visit" wide>
        <VisitForm
          memberId={id}
          onSuccess={() => { setShowVisitForm(false); }}
          onCancel={() => setShowVisitForm(false)}
        />
      </Modal>

      <Modal open={showDiseaseForm} onClose={() => setShowDiseaseForm(false)} title="Add Disease / Condition">
        <DiseaseHistoryForm
          memberId={id}
          onSuccess={() => setShowDiseaseForm(false)}
          onCancel={() => setShowDiseaseForm(false)}
        />
      </Modal>

      <Modal open={showPregnancyForm} onClose={() => setShowPregnancyForm(false)} title="New Pregnancy Record">
        <PregnancyForm
          memberId={id}
          onSuccess={() => setShowPregnancyForm(false)}
          onCancel={() => setShowPregnancyForm(false)}
        />
      </Modal>

      <Modal open={showReferralForm} onClose={() => setShowReferralForm(false)} title="New Referral">
        <ReferralForm
          memberId={id}
          onSuccess={() => setShowReferralForm(false)}
          onCancel={() => setShowReferralForm(false)}
        />
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={[styles.infoValue, mono ? styles.mono : ''].join(' ')}>{value || '—'}</span>
    </div>
  );
}
