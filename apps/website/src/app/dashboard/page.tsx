'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
}

const TENANTS: Record<string, { name: string; location: string; logo: string }> = {
  readycar: { name: 'ReadyCar', location: 'Stittsville, ON', logo: '/readycar-logo-real.png' },
  readyride: { name: 'ReadyRide', location: 'Gloucester, ON', logo: '/readyride-logo-real.png' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth');
        if (!res.ok) { router.replace('/login'); return; }
        const data = await res.json();
        if (!data.authenticated) { router.replace('/login'); return; }
        setUser(data.user);
      } catch (err) {
        console.error('[dashboard] Session check error:', err instanceof Error ? err.message : 'unknown');
        router.replace('/login');
      }
      setLoading(false);
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/login');
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.loading}>Loading...</p></div>;
  }

  if (!user) return null;

  // Admin sees all tenants, staff/manager sees only their own
  const visibleTenants = user.role === 'admin'
    ? Object.entries(TENANTS)
    : Object.entries(TENANTS).filter(([id]) => id === user.tenant_id);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoMark}>N</div>
        <h1 className={styles.greeting}>Welcome, {user.name.split(' ')[0]}</h1>
        <p className={styles.subtitle}>Select a dealership to manage</p>
      </div>

      <div className={styles.grid}>
        {visibleTenants.map(([tenantId, tenant]) => (
          <Link key={tenantId} href={`/${tenantId}`} className={styles.tenantCard}>
            <img src={tenant.logo} alt={tenant.name} className={styles.tenantLogo} />
            <h2 className={styles.tenantName}>{tenant.name}</h2>
            <p className={styles.tenantLocation}>{tenant.location}</p>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className={styles.logoutBtn}>
        Sign Out
      </button>
    </div>
  );
}
