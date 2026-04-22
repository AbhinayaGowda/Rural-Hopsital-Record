import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import DeliveryForm from './DeliveryForm.jsx';
import TerminateForm from './TerminateForm.jsx';
import outcomeStyles from './pregnancy-outcome.module.css';

export default function PregnancyOutcomeActions({ pregnancy, memberId }) {
  const [modal, setModal] = useState(null); // 'deliver' | 'terminate' | null

  // Only active pregnancies can receive an outcome
  if (pregnancy.status !== 'active') return null;

  const close = () => setModal(null);

  return (
    <>
      <div className={outcomeStyles.actions}>
        <Button size="sm" onClick={() => setModal('deliver')}>
          Mark Delivered
        </Button>
        <Button size="sm" variant="danger" onClick={() => setModal('terminate')}>
          Mark Terminated
        </Button>
      </div>

      <Modal
        open={modal === 'deliver'}
        onClose={close}
        title="Record Delivery"
        wide
      >
        <DeliveryForm
          pregnancyId={pregnancy.id}
          memberId={memberId}
          onSuccess={close}
          onCancel={close}
        />
      </Modal>

      <Modal
        open={modal === 'terminate'}
        onClose={close}
        title="Record Pregnancy Outcome"
      >
        <TerminateForm
          pregnancyId={pregnancy.id}
          memberId={memberId}
          onSuccess={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

PregnancyOutcomeActions.propTypes = {
  pregnancy: PropTypes.shape({
    id:     PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  memberId: PropTypes.string.isRequired,
};
