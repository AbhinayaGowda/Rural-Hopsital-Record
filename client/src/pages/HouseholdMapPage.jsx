import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { householdsApi } from '../api/households.js';
import Spinner from '../components/Spinner.jsx';
import styles from './page.module.css';

const MapView = lazy(() => import('../components/HouseholdMapView.jsx'));

export default function HouseholdMapPage() {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['households-map'],
    queryFn:  () => householdsApi.listForMap(),
    enabled:  !!session,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Spinner center />;

  const points = data ?? [];

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Household Map</h1>
      <p className={styles.meta}>{points.length} household{points.length !== 1 ? 's' : ''} with GPS coordinates</p>

      <Suspense fallback={<Spinner center />}>
        <MapView households={points} />
      </Suspense>
    </div>
  );
}
